import type {
  JSONRPCRequest,
  JSONRPCResponse,
  MiddlewareFactory,
  ServerManifest,
} from '../rpc/types';
import type { TLSConfig } from '../network/types';
import Logger from '@matrixai/logger';
import { CreateDestroyStartStop } from '@matrixai/async-init/dist/CreateDestroyStartStop';
import * as errors from './errors';
import * as events from './events';
import WebSocketServer from '../websockets/WebSocketServer';
import RPCServer from '../rpc/RPCServer';
import * as rpcUtilsMiddleware from '../rpc/utils/middleware';
import config from '../config';

interface ClientService extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new errors.ErrorClientServiceRunning(),
  new errors.ErrorClientServiceDestroyed(),
  {
    eventStart: events.EventClientServiceStart,
    eventStarted: events.EventClientServiceStarted,
    eventStop: events.EventClientServiceStop,
    eventStopped: events.EventClientServiceStopped,
    eventDestroy: events.EventClientServiceDestroy,
    eventDestroyed: events.EventClientServiceDestroyed,
  },
)
class ClientService {
  public static async createClientService({
    manifest,
    tlsConfig,
    options: {
      middlewareFactory,
      host = config.defaultsUser.clientServiceHost,
      port = config.defaultsUser.clientServicePort,
      keepAliveTimeoutTime = config.defaultsSystem.clientKeepAliveTimeoutTime,
      keepAliveIntervalTime = config.defaultsSystem.clientKeepAliveIntervalTime,
      rpcCallTimeoutTime = config.defaultsSystem.rpcCallTimeoutTime,
      rpcParserBufferSize = config.defaultsSystem.rpcParserBufferSize,
    },
    logger = new Logger(this.name),
  }: {
    manifest: ServerManifest;
    tlsConfig: TLSConfig;
    options: {
      middlewareFactory?: MiddlewareFactory<
        JSONRPCRequest,
        JSONRPCRequest,
        JSONRPCResponse,
        JSONRPCResponse
      >;
      host?: string;
      port?: number;
      keepAliveTimeoutTime?: number;
      keepAliveIntervalTime?: number;
      rpcCallTimeoutTime?: number;
      rpcParserBufferSize?: number;
    };
    logger?: Logger;
  }): Promise<ClientService> {
    logger.info(`Creating ${this.name}`);

    const rpcServer = await RPCServer.createRPCServer({
      handlerTimeoutGraceTime: 2000, // TODO: this will be removed.
      handlerTimeoutTime: rpcCallTimeoutTime,
      manifest,
      middlewareFactory: rpcUtilsMiddleware.defaultServerMiddlewareWrapper(
        // ClientUtilsMiddleware.middlewareServer(sessionManager, keyRing),
        middlewareFactory,
        rpcParserBufferSize,
      ),
      sensitive: false,
      logger: logger.getChild(RPCServer.name),
    });

    const webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (rpcStream) => rpcServer.handleStream(rpcStream),
      host,
      port,
      tlsConfig,
      // FIXME: Not sure about this, maxIdleTimeout doesn't seem to be used?
      maxIdleTimeout: keepAliveTimeoutTime,
      pingIntervalTime: keepAliveIntervalTime,
      pingTimeoutTimeTime: keepAliveTimeoutTime,
      logger: logger.getChild(WebSocketServer.name),
    });

    const clientService = new ClientService({
      rpcServer,
      webSocketServer,
      logger,
    });
    await clientService.start({
      tlsConfig,
      options: {
        host,
        port,
      },
    });
    logger.info(`Created ${this.name}`);
    return clientService;
  }

  protected rpcServer: RPCServer;
  protected webSocketServer: WebSocketServer;
  protected logger: Logger;

  constructor({
    rpcServer,
    webSocketServer,
    logger,
  }: {
    rpcServer: RPCServer;
    webSocketServer: WebSocketServer;
    logger: Logger;
  }) {
    this.rpcServer = rpcServer;
    this.webSocketServer = webSocketServer;
    this.logger = logger;
  }

  get host() {
    return this.webSocketServer.getHost();
  }

  get port() {
    return this.webSocketServer.getPort();
  }

  public async start({
    tlsConfig,
    options: {
      host = config.defaultsUser.clientServiceHost,
      port = config.defaultsUser.clientServicePort,
    },
  }: {
    tlsConfig: TLSConfig;
    options: {
      host?: string;
      port?: number;
    };
  }): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    await this.webSocketServer.start({
      tlsConfig,
      host,
      port,
      connectionCallback: (rpcStream) => this.rpcServer.handleStream(rpcStream),
    });
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop({
    force = false,
  }: { force?: boolean } = {}): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    await this.webSocketServer.stop(force);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy({
    force = false,
  }: { force?: boolean } = {}): Promise<void> {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.rpcServer.destroy(force);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  public setTlsConfig(tlsConfig: TLSConfig): void {
    this.webSocketServer.setTlsConfig(tlsConfig);
  }
}

export default ClientService;
