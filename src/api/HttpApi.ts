import fs from 'fs';
import net from 'net';
import path from 'path';
import http from 'http';
import https from 'https';
import jsyaml from 'js-yaml';
import express, { RequestHandler } from 'express';
import passport from 'passport'
import { getPort } from '../utils';
import session from 'express-session'
import swaggerUI from 'swagger-ui-express';
import { Address } from '../peers/PeerInfo';
import { BasicStrategy } from 'passport-http';
import OAuth2 from './AuthorizationServer/OAuth2';
import * as utils from './AuthorizationServer/utils';
import * as config from './AuthorizationServer/Config';
import * as OpenApiValidator from 'express-openapi-validator';
import { User, Client } from './AuthorizationServer/OAuth2Store';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import { TLSCredentials } from '../keys/pki/PublicKeyInfrastructure';
import { Strategy as ClientPasswordStrategy } from 'passport-oauth2-client-password';
import { DEFAULT_ENCODING } from 'crypto';

class HttpApi {
  private openApiPath: string

  private updateApiAddress: (apiAddress: Address) => void;
  private handleCSR: (csr: string) => string;
  private getRootCertificate: () => string;
  private getCertificateChain: () => string[];
  private getVaultNames: () => string[];
  private newVault: (vaultName: string) => Promise<void>;
  private deleteVault: (vaultName: string) => Promise<void>;
  private listSecrets: (vaultName: string) => string[];
  private getSecret: (vaultName: string, secretName: string) => Buffer;
  private newSecret: (vaultName: string, secretName: string, secretContent: Buffer) => Promise<void>;
  private deleteSecret: (vaultName: string, secretName: string) => Promise<void>;

  private tlsCredentials: TLSCredentials
  private oauth: OAuth2
  private expressServer: express.Express;
  private httpServer: http.Server;

  constructor(
    updateApiAddress: (apiAddress: Address) => void,
    handleCSR: (csr: string) => string,
    getRootCertificate: () => string,
    getCertificateChain: () => string[],
    getTlsCredentials: () => TLSCredentials,
    getVaultNames: () => string[],
    newVault: (vaultName: string) => Promise<void>,
    deleteVault: (vaultName: string) => Promise<void>,
    listSecrets: (vaultName: string) => string[],
    getSecret: (vaultName: string, secretName: string) => Buffer,
    newSecret: (vaultName: string, secretName: string, secretContent: string | Buffer) => Promise<void>,
    deleteSecret: (vaultName: string, secretName: string) => Promise<void>,
  ) {
    // this code is needed as we can't require yaml files
    const fromSrcFolderPath = path.join(__dirname, '../../openapi.yaml')
    const fromDistFolderPath = path.join(__dirname, '../openapi.yaml')
    if (fs.existsSync(fromSrcFolderPath)) {
      this.openApiPath = fromSrcFolderPath
    } else {
      this.openApiPath = fromDistFolderPath
    }
    this.updateApiAddress = updateApiAddress;
    this.handleCSR = handleCSR;
    this.getRootCertificate = getRootCertificate;
    this.getCertificateChain = getCertificateChain;
    this.getVaultNames = getVaultNames
    this.newVault = newVault
    this.deleteVault = deleteVault
    this.listSecrets = listSecrets
    this.getSecret = getSecret
    this.newSecret = newSecret
    this.deleteSecret = deleteSecret

    this.tlsCredentials = getTlsCredentials()
    this.oauth = new OAuth2(
      this.tlsCredentials.keypair.public,
      this.tlsCredentials.keypair.private
    )
    this.expressServer = express();
  }

  async start(port: number = 0) {
    return new Promise<number>(async (resolve, reject) => {
      const port = await getPort(1314, process.env.PK_PEER_HOST ?? 'localhost')

      this.expressServer.set('view engine', 'ejs')
      // Session Configuration
      const MemoryStore = session.MemoryStore
      this.expressServer.use(session({
        saveUninitialized: true,
        resave: true,
        secret: 'secret',
        store: new MemoryStore(),
        cookie: { maxAge: 3600000 * 24 * 7 * 52 },
      }));

      this.expressServer.use(express.json());
      this.expressServer.use(express.text());
      this.expressServer.use(express.urlencoded({ extended: false }));

      // create default client and user for the polykey node (highest priviledge)
      this.oauth.store.saveClient('polykey', utils.createUuid(), ['admin'], true)
      this.oauth.store.saveUser('polykey', 'polykey', utils.createUuid(), ['admin'], true)

      this.expressServer.use(passport.initialize());
      this.expressServer.use(passport.session());

      // redirect from base url to docs
      this.expressServer.get('/', (req, res, next) => {
        res.redirect('/docs')
      })

      passport.use("clientBasic", new BasicStrategy(
        (clientId, clientSecret, done) => {
          try {
            const client = this.oauth.store.getClient(clientId)
            client.validate(clientSecret)
            done(null, client)
          } catch (error) {
            done(null, false)
          }
        }
      ));
      /**
       * BearerStrategy
       *
       * This strategy is used to authenticate either users or clients based on an access token
       * (aka a bearer token).  If a user, they must have previously authorized a client
       * application, which is issued an access token to make requests on behalf of
       * the authorizing user.
       *
       * To keep this example simple, restricted scopes are not implemented, and this is just for
       * illustrative purposes
       */
      passport.use('accessToken', new BearerStrategy((token, done) => {
        try {
          const accessToken = this.oauth.store.getAccessToken(token)
          const user = this.oauth.store.getUser(accessToken.userId!)
          done(null, user, { scope: accessToken.scope ?? [] })
        } catch (error) {
          done(null, false)
        }
      }));

      /**
       * Client Password strategy
       *
       * The OAuth 2.0 client password authentication strategy authenticates clients
       * using a client ID and client secret. The strategy requires a verify callback,
       * which accepts those credentials and calls done providing a client.
       */
      passport.use('clientPassword', new ClientPasswordStrategy((clientId, clientSecret, done) => {
        try {
          const client = this.oauth.store.getClient(clientId)
          client.validate(clientSecret)
          done(null, client)
        } catch (error) {
          done(null, false)
        }
      }));

      // Register serialialization and deserialization functions.
      //
      // When a client redirects a user to user authorization endpoint, an
      // authorization transaction is initiated.  To complete the transaction, the
      // user must authenticate and approve the authorization request.  Because this
      // may involve multiple HTTPS request/response exchanges, the transaction is
      // stored in the session.
      //
      // An application must supply serialization functions, which determine how the
      // client object is serialized into the session.  Typically this will be a
      // simple matter of serializing the client's ID, and deserializing by finding
      // the client by ID from the database.
      passport.serializeUser((user: User, done) => {
        done(null, user.id);
      });

      passport.deserializeUser((id: string, done) => {
        try {
          const user = this.oauth.store.getUser(id)
          done(null, user)
        } catch (error) {
          done(error)
        }
      });

      // token endpoints
      this.expressServer.post('/oauth/token', this.oauth.token);
      this.expressServer.post('/oauth/refresh', this.oauth.token);
      this.expressServer.get('/oauth/tokeninfo', [
        passport.authenticate(['accessToken'], { session: true }),
        this.oauth.tokenInfo.bind(this.oauth)
      ]);
      this.expressServer.get('/oauth/revoke', this.oauth.revokeToken.bind(this.oauth));

      // OpenAPI endpoints
      const schema = jsyaml.load(fs.readFileSync(this.openApiPath).toString())
      this.expressServer.get('/spec', (req, res) => {
        res.type('json').send(JSON.stringify(schema, null, 2))
      });
      this.expressServer.use(
        '/docs',
        swaggerUI.serve,
        swaggerUI.setup(schema, undefined, {
          oauth: {
            clientId: 'polykey'
          },
        })
      );

      this.expressServer.use(
        OpenApiValidator.middleware({
          apiSpec: schema,
          validateResponses: true
        })
      )
      this.setupOpenApiRouter()

      // Start the server
      const pkHost = process.env.PK_PEER_HOST ?? 'localhost'
      const httpsOptions: https.ServerOptions = {
        cert: this.tlsCredentials.certificate,
        key: this.tlsCredentials.keypair.private,
        ca: this.tlsCredentials.rootCertificate
      }
      this.httpServer = https.createServer(httpsOptions, this.expressServer).listen(port, () => {
        const addressInfo = <net.AddressInfo>this.httpServer.address();
        const address = Address.fromAddressInfo(addressInfo);
        address.updateHost(pkHost)
        this.updateApiAddress(address)

        console.log(`HTTP API endpoint: https://${address.toString()}`);
        console.log(`HTTP API docs: https://${address.toString()}/docs/`);

        resolve(port);
      });
    })
  }

  getOAuthClient(): Client {
    return this.oauth.store.getClient('polykey')
  }

  listOAuthTokens(): string[] {
    return Array.from(this.oauth.store.accessTokenStore.keys())
  }

  newOAuthToken(scopes: string[] = [], expiry: number = 3600): string {
    const expiryDate = new Date(Date.now() + expiry * 1000)
    const token = utils.createToken(this.oauth.store.privateKey, config.token.expiresIn, 'polykey')
    this.oauth.store.saveAccessToken(token, expiryDate, 'polykey', 'polykey', scopes)
    return token
  }

  revokeOAuthToken(token: string): boolean {
    this.oauth.store.deleteAccessToken(token)
    return !this.oauth.store.hasAccessToken(token)
  }

  // === openapi endpoints === //
  private handleRootCertificateRequest: RequestHandler = async (req, res, next) => {
    try {
      const response = this.getRootCertificate();
      this.writeString(res, response);
    } catch (error) {
      this.writeError(res, error);
    }
  };

  private handleCertificateChainRequest: RequestHandler = async (req, res, next) => {
    try {
      const response = this.getCertificateChain();
      this.writeStringList(res, response);
    } catch (error) {
      this.writeError(res, error);
    }
  };

  private handleCertificateSigningRequest: RequestHandler = async (req, res, next) => {
    try {
      const body = req.body;
      const response = this.handleCSR(body);
      this.writeString(res, response);
    } catch (error) {
      this.writeError(res, error);
    }
  };

  private handleVaultsListRequest: RequestHandler = async (req, res, next) => {
    try {
      const response = this.getVaultNames()
      this.writeStringList(res, response);
    } catch (error) {
      this.writeError(res, error);
    }
  };

  private handleNewVaultRequest: RequestHandler = async (req, res, next) => {
    try {
      const vaultName = (<any>req).openapi.pathParams.vaultName;
      await this.newVault(vaultName)
      this.writeSuccess(res);
    } catch (error) {
      this.writeError(res, error);
    }
  };

  private handleDeleteVaultRequest: RequestHandler = async (req, res, next) => {
    try {
      const vaultName = (<any>req).openapi.pathParams.vaultName;
      await this.deleteVault(vaultName)
      this.writeSuccess(res);
    } catch (error) {
      this.writeError(res, error);
    }
  };

  private handleSecretsListRequest: RequestHandler = async (req, res, next) => {
    try {
      const vaultName = (<any>req).openapi.pathParams.vaultName;
      const response = this.listSecrets(vaultName);
      this.writeStringList(res, response);
    } catch (error) {
      this.writeError(res, error);
    }
  };

  private handleGetSecretRequest: RequestHandler = async (req, res, next) => {
    try {

      const vaultName = (<any>req).openapi.pathParams.vaultName;
      const secretName = (<any>req).openapi.pathParams.secretName;
      const response = this.getSecret(vaultName, secretName)

      const accepts = req.accepts()[0]
        if (!accepts || accepts == 'text/plain' || accepts == '*/*') {
        this.writeString(res, response.toString())
      } else if (accepts == 'application/octet-stream') {
        this.writeBinary(res, secretName, response);
      } else {
        throw Error(`MIME type not supported: ${accepts}`)
      }
    } catch (error) {
      this.writeError(res, error);
    }
  };

  private handleNewSecretRequest: RequestHandler = async (req, res, next) => {
    try {
      const vaultName = (<any>req).openapi.pathParams.vaultName;
      const secretName = (<any>req).openapi.pathParams.secretName;

      let secretContent: Buffer
      const contentType = req.headers['content-type']
      if (contentType == 'text/plain') {
        secretContent = Buffer.from(req.body)
      } else if (contentType == 'application/octet-stream') {
        secretContent = await new Promise<Buffer>((resolve, reject) => {
          const bufferList: Buffer[] = []
          req.on('data', (data) => bufferList.push(data))
          req.on('error', (err) => reject(err))
          req.on('end', () => resolve(Buffer.concat(bufferList)))
        })
      } else {
        throw Error(`MIME type not supported: ${contentType}`)
      }

      await this.newSecret(vaultName, secretName, secretContent);
      this.writeSuccess(res);
    } catch (error) {
      this.writeError(res, error);
    }
  };

  private handleDeleteSecretRequest: RequestHandler = async (req, res, next) => {
    try {
      const vaultName = (<any>req).openapi.pathParams.vaultName;
      const secretName = (<any>req).openapi.pathParams.secretName;
      await this.deleteSecret(vaultName, secretName);
      this.writeSuccess(res);
    } catch (error) {
      this.writeError(res, error);
    }
  };

  // === Helper methods === //
  private writeSuccess(res: http.ServerResponse) {
    res.writeHead(200);
    res.end();
  }
  private writeError(res: http.ServerResponse, error: Error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }, null, 2));
  }
  private writeString(res: http.ServerResponse, text: string) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(text);
  }
  private writeStringList(res: http.ServerResponse, list: string[]) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(list, null, 2));
  }
  private writeJson(res: http.ServerResponse, payload: Object) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload, null, 2));
  }
  private writeBinary(res: http.ServerResponse, filename: string, payload: Buffer) {
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `file; filename="${filename}"`
    });
    res.end(payload, 'binary');
  }

  private checkScope(scope: string[]) {
    return (req, res, next) => {
      // access control middleware to check for required scope
      if (!scope.some(r => req.authInfo.scope.includes(r))) {
        res.statusCode = 403;
        return res.end('Forbidden');
      }
      return next();
    }
  }

  /**
   * The purpose of this route is to collect the request variables as defined in the
   * OpenAPI document and pass them to the handling controller as another Express
   * middleware. All parameters are collected in the requet.swagger.values key-value object
   *
   * The assumption is that security handlers have already verified and allowed access
   * to this path. If the business-logic of a particular path is dependant on authentication
   * parameters (e.g. scope checking) - it is recommended to define the authentication header
   * as one of the parameters expected in the OpenAPI/Swagger document.
   *
   * Requests made to paths that are not in the OpernAPI scope
   * are passed on to the next middleware handler.
   */
  private setupOpenApiRouter() {
    // setup all endpoints
    ///////////////////////////
    // Certificate Authority //
    ///////////////////////////
    this.expressServer.get('/ca/root_certificate', [
      passport.authenticate(['accessToken'], { session: true }),
      this.handleRootCertificateRequest.bind(this)
    ])
    this.expressServer.get('/ca/certificate_chain', [
      passport.authenticate(['accessToken'], { session: true }),
      this.handleCertificateChainRequest.bind(this)
    ])
    this.expressServer.post('/ca/certificate_signing_request', [
      passport.authenticate(['accessToken'], { session: true }),
      this.checkScope(['admin', 'request_certificate']),
      this.handleCertificateSigningRequest.bind(this)
    ])
    ////////////
    // Vaults //
    ////////////
    this.expressServer.get('/vaults', [
      passport.authenticate(['accessToken'], { session: true }),
      this.checkScope(['admin', 'write_vaults', 'read_vaults']),
      this.handleVaultsListRequest.bind(this)
    ])
    this.expressServer.post('/vaults/:vaultName', [
      passport.authenticate(['accessToken'], { session: true }),
      this.checkScope(['admin', 'write_vaults']),
      this.handleNewVaultRequest.bind(this)
    ])
    this.expressServer.delete('/vaults/:vaultName', [
      passport.authenticate(['accessToken'], { session: true }),
      this.checkScope(['admin', 'write_vaults']),
      this.handleDeleteVaultRequest.bind(this)
    ])
    /////////////
    // Secrets //
    /////////////
    this.expressServer.get('/vaults/:vaultName', [
      passport.authenticate(['accessToken'], { session: true }),
      this.checkScope(['admin', 'write_secrets', 'read_secrets']),
      this.handleSecretsListRequest.bind(this)
    ])
    this.expressServer.get('/secrets/:vaultName/:secretName', [
      passport.authenticate(['accessToken'], { session: true }),
      this.checkScope(['admin', 'write_secrets', 'read_secrets']),
      this.handleGetSecretRequest.bind(this)
    ])
    this.expressServer.post('/secrets/:vaultName/:secretName', [
      passport.authenticate(['accessToken'], { session: true }),
      this.checkScope(['admin', 'write_secrets']),
      this.handleNewSecretRequest.bind(this)
    ])
    this.expressServer.delete('/secrets/:vaultName/:secretName', [
      passport.authenticate(['accessToken'], { session: true }),
      this.checkScope(['admin', 'write_secrets']),
      this.handleDeleteSecretRequest.bind(this)
    ])
  }
}

export default HttpApi;
