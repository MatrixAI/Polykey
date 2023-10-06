import type {
  JSONRPCRequest,
  JSONRPCResponse,
  MiddlewareFactory,
  ServerManifest,
} from '@matrixai/rpc';
import type { TLSConfig } from '../network/types';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  status,
  destroyed,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { WebSocketServer, events as wsEvents } from '@matrixai/ws';
import { RPCServer } from '@matrixai/rpc';
import { middleware as rpcUtilsMiddleware } from '@matrixai/rpc';
import * as events from './events';
import * as errors from './errors';
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

    const rpcServer = new RPCServer({
      idGen: async () => null,
      handlerTimeoutTime: rpcCallTimeoutTime,
      middlewareFactory: rpcUtilsMiddleware.defaultServerMiddlewareWrapper(
        // ClientUtilsMiddleware.middlewareServer(sessionManager, keyRing),
        middlewareFactory,
        rpcParserBufferSize,
      ),
      logger: logger.getChild(RPCServer.name),
    });

    await rpcServer.start({ manifest });

    const webSocketServer = new WebSocketServer({
      config: {
        key: tlsConfig.keyPrivatePem,
        cert: tlsConfig.certChainPem,
        keepAliveIntervalTime,
        keepAliveTimeoutTime,
      },
      // FIXME: Not sure about this, maxIdleTimeout doesn't seem to be used?
      logger: logger.getChild(WebSocketServer.name),
    });

    const clientService = new ClientService({
      rpcServer,
      webSocketServer,
      logger,
    });
    await clientService.start({
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
    return this.webSocketServer.host;
  }

  get port() {
    return this.webSocketServer.port;
  }

  protected handleEventWebSocketServerConnection = (
    evt: wsEvents.EventWebSocketServerConnection,
  ) => {
    const conn = evt.detail;
    const streamHandler = (evt: wsEvents.EventWebSocketConnectionStream) => {
      if (
        this.rpcServer[destroyed] ||
        this.rpcServer[status] === 'destroying' ||
        this.rpcServer[status] === 'stopping'
      ) {
        return;
      }
      const stream = evt.detail;
      this.rpcServer.handleStream(stream);
    };
    conn.addEventListener(
      wsEvents.EventWebSocketConnectionStream.name,
      streamHandler,
    );
    conn.addEventListener(
      wsEvents.EventWebSocketConnectionClose.name,
      () => {
        conn.removeEventListener(
          wsEvents.EventWebSocketConnectionStream.name,
          streamHandler,
        );
      },
      { once: true },
    );
  };

  public async start({
    options: {
      host = config.defaultsUser.clientServiceHost,
      port = config.defaultsUser.clientServicePort,
    },
  }: {
    options: {
      host?: string;
      port?: number;
    };
  }): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    this.webSocketServer.addEventListener(
      wsEvents.EventWebSocketServerConnection.name,
      this.handleEventWebSocketServerConnection,
    );
    await this.webSocketServer.start({
      host,
      port,
    });
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop({
    force = false,
  }: { force?: boolean } = {}): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    await this.rpcServer.stop({ force: true });
    await this.webSocketServer.stop({ force });
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy({
    force = false,
  }: { force?: boolean } = {}): Promise<void> {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.stop({ force });
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  public setTlsConfig(tlsConfig: TLSConfig): void {
    this.webSocketServer.updateConfig({
      key: tlsConfig.keyPrivatePem,
      cert: tlsConfig.certChainPem,
    });
  }
}

export default ClientService;
