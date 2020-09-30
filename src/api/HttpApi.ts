import fs from 'fs';
import net from 'net';
import http from 'http';
import path from 'path';
import jsyaml from 'js-yaml';
import connect from 'connect';
import swaggerTools from 'swagger-tools';
import PeerInfo, { Address } from '../peers/PeerInfo';

class HttpApi {
  private getLocalPeerInfo: () => PeerInfo;
  private updateApiAddress: (apiAddress: Address) => void;
  private handleCSR: (csr: string) => string;
  private getRootCertificate: () => string;
  private getCertificateChain: () => string[];

  private httpServer: http.Server;
  private connectServer: connect.Server;

  constructor(
    getPeerInfo: () => PeerInfo,
    updateApiAddress: (apiAddress: Address) => void,
    handleCSR: (csr: string) => string,
    getRootCertificate: () => string,
    getCertificateChain: () => string[]
  ) {
    this.getLocalPeerInfo = getPeerInfo;
    this.updateApiAddress = updateApiAddress;
    this.handleCSR = handleCSR;
    this.getRootCertificate = getRootCertificate;
    this.getCertificateChain = getCertificateChain;

    this.connectServer = connect();
  }

  async start(port: number = 0): Promise<number> {
    return await new Promise((resolve, reject) => {
      // this code is needed as we can't require yaml files
      let yamlDoc: string;
      const fromSrcFolderPath = path.join(__dirname, '../../openapi.yaml');
      const fromDistFolderPath = path.join(__dirname, '../openapi.yaml');
      if (fs.existsSync(fromSrcFolderPath)) {
        yamlDoc = fs.readFileSync(fromSrcFolderPath).toString();
      } else {
        yamlDoc = fs.readFileSync(fromDistFolderPath).toString();
      }
      const swaggerDoc = jsyaml.load(yamlDoc);

      // Initialize the Swagger middleware
      swaggerTools.initializeMiddleware(swaggerDoc, (middleware) => {
        // Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
        this.connectServer.use(middleware.swaggerMetadata());

        // Validate Swagger requests
        this.connectServer.use(middleware.swaggerValidator());

        // Route validated requests to appropriate controller
        this.connectServer.use(
          middleware.swaggerRouter({
            controllers: this.ControllerOptions,
            useStubs: process.env.NODE_ENV === 'development', // Conditionally turn on stubs (mock mode)
          }),
        );

        // Serve the Swagger documents and Swagger UI
        this.connectServer.use(middleware.swaggerUi());

        // Start the server
        this.httpServer = http.createServer(this.connectServer).listen(port, () => {
          const addressInfo = <net.AddressInfo>this.httpServer.address();
          const address = Address.fromAddressInfo(addressInfo);
          this.updateApiAddress(address);

          console.log(`HTTP API served at: http://${address.toString()}`);
          console.log(`HTTP API docs served at: http://${address.toString()}/docs`);

          resolve(port);
        });
      });
    });
  }

  private async handleCertificateSigningRequest(csr: string) {
    return this.handleCSR(csr)
  }

  private async handleRootCertificateRequest() {
    return {
      rootCert: this.getRootCertificate(),
    };
  }

  private async handleCertificateChainRequest() {
    return this.getCertificateChain()
  }

  ////////////////////////
  // Controller methods //
  ////////////////////////
  private get ControllerOptions(): swaggerTools.SwaggerRouter20OptionsControllers {
    const options: swaggerTools.SwaggerRouter20OptionsControllers = {};
    options['certificateSigningRequest'] = this.certificateSigningRequest.bind(this);
    options['rootCertificate'] = this.rootCertificate.bind(this);
    options['certificateChain'] = this.certificateChain.bind(this);
    return options;
  }

  private certificateSigningRequest: swaggerTools.SwaggerRouter20HandlerFunction = async (req, res, next) => {
    try {
      const body = req.swagger.params['body'].value;
      const response = await this.handleCertificateSigningRequest(body);
      this.writeJson(res, response);
    } catch (error) {
      this.writeJson(res, error);
    }
  };

  private rootCertificate: swaggerTools.SwaggerRouter20HandlerFunction = async (req, res, next) => {
    try {
      const response = await this.handleRootCertificateRequest();
      this.writeJson(res, response);
    } catch (error) {
      this.writeJson(res, error);
    }
  };

  private certificateChain: swaggerTools.SwaggerRouter20HandlerFunction = async (req, res, next) => {
    try {
      const response = await this.handleCertificateChainRequest();
      this.writeJson(res, response);
    } catch (error) {
      this.writeJson(res, error);
    }
  };

  // === Helper methods === //
  private writeJson(response: http.ServerResponse, payload?: Object | Error | Array<any>, code: number = 200) {
    let responseString: string | undefined;
    if (!payload) {
      responseString = undefined;
    } else if (payload instanceof Error) {
      code = 500;
      responseString = JSON.stringify({ error: payload.message }, null, 2);
    } else {
      responseString = JSON.stringify(payload, null, 2);
    }
    response.writeHead(code, { 'Content-Type': 'application/json' });
    response.end(responseString);
  }
}

export default HttpApi;
