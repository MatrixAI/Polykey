import passport from 'passport';
import Logger from '@matrixai/js-logger';
import * as utils from './utils';
import * as config from './Config';
import oauth2orize from 'oauth2orize';
import Validation from './Validation';
import OAuth2Store from './OAuth2Store';

class OAuth2 {
  store: OAuth2Store;
  private server: oauth2orize.OAuth2Server;
  private validation: Validation;
  private expiresIn = { expires_in: config.token.expiresIn };
  private logger: Logger;

  constructor(publicKey: string, privateKey: string, logger: Logger) {
    this.store = new OAuth2Store(publicKey, privateKey);
    this.server = oauth2orize.createServer();
    this.validation = new Validation(this.store);
    this.logger = logger;

    /**
     * Exchange client credentials for access tokens.
     */
    this.server.exchange(
      oauth2orize.exchange.clientCredentials(async (client, scope, done) => {
        try {
          const token = utils.createToken(
            this.store.privateKey,
            config.token.expiresIn,
            client.id,
          );
          const expiration = config.token.calculateExpirationDate();
          // Pass in a null for user id since there is no user when using this grant type
          const user = this.store.findUserByUsername(client.id);
          const accessToken = this.store.saveAccessToken(
            token,
            expiration,
            user.id,
            client.id,
            scope,
          );
          done(null, accessToken.token, undefined, this.expiresIn);
        } catch (error) {
          done(error, false);
        }
      }),
    );

    this.server.serializeClient((client, done) => {
      done(null, client.id);
    });

    this.server.deserializeClient((id, done) => {
      try {
        const client = this.store.getClient(id);
        done(null, client);
      } catch (error) {
        done(error, null);
      }
    });
  }

  tokenInfo(req, res) {
    try {
      const accessToken = this.validation.tokenForHttp(req.query.access_token);
      this.validation.tokenExistsForHttp(accessToken);
      const client = this.store.getClient(accessToken.clientId!);
      this.validation.clientExistsForHttp(client);
      const expirationLeft = Math.floor(
        (accessToken.expiration.getTime() - Date.now()) / 1000,
      );
      res.status(200).json({ audience: client.id, expires_in: expirationLeft });
    } catch (error) {
      this.logger.error(error.toString());
      res.status(500).json({ error: error.message });
    }
  }

  revokeToken(req, res) {
    try {
      let accessToken = this.validation.tokenForHttp(req.query.token);
      accessToken = this.store.deleteAccessToken(accessToken.token);
      if (!accessToken) {
        accessToken = this.store.deleteRefreshToken(req.query.token);
      }
      this.validation.tokenExistsForHttp(accessToken);
      res.status(200).json({});
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  public get token() {
    return [
      passport.authenticate(['clientBasic', 'clientPassword'], {
        session: true,
      }),
      this.server.token(),
      this.server.errorHandler(),
    ];
  }
}

export default OAuth2;
