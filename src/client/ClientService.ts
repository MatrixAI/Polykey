import type {
  IdGen,
  JSONRPCRequest,
  JSONRPCResponse,
  MiddlewareFactory,
  ServerManifest,
} from '@matrixai/rpc';
import type { TLSConfig } from '../network/types';
import Logger from '@matrixai/logger';
import { StartStop, ready } from '@matrixai/async-init/dist/StartStop';
import { running, status } from '@matrixai/async-init';
import { WebSocketServer, events as wsEvents } from '@matrixai/ws';
import { RPCServer, middleware as rpcMiddleware } from '@matrixai/rpc';
import * as events from './events';
import * as errors from './errors';
import * as networkUtils from '../network/utils';
import config from '../config';

interface ClientService extends StartStop {}
@StartStop({
  eventStart: events.EventClientServiceStart,
  eventStarted: events.EventClientServiceStarted,
  eventStop: events.EventClientServiceStop,
  eventStopped: events.EventClientServiceStopped,
})
class ClientService {
  protected rpcServer: RPCServer;
  protected webSocketServer: WebSocketServer;
  protected logger: Logger;

  protected handleEventWebSocketServerConnection = (
    evt: wsEvents.EventWebSocketServerConnection,
  ) => {
    const conn = evt.detail;
    const streamHandler = (evt: wsEvents.EventWebSocketConnectionStream) => {
      const stream = evt.detail;
      if (!this.rpcServer[running] || this.rpcServer[status] === 'stopping') {
        stream.cancel(Error('TMP RPCServer not running'));
        return;
      }
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

  public constructor({
    tlsConfig,
    middlewareFactory,
    idGen = async () => null,
    keepAliveTimeoutTime = config.defaultsSystem.clientKeepAliveTimeoutTime,
    keepAliveIntervalTime = config.defaultsSystem.clientKeepAliveIntervalTime,
    rpcCallTimeoutTime = config.defaultsSystem.rpcCallTimeoutTime,
    rpcParserBufferSize = config.defaultsSystem.rpcParserBufferSize,
    logger,
  }: {
    tlsConfig: TLSConfig;
    middlewareFactory?: MiddlewareFactory<
      JSONRPCRequest,
      JSONRPCRequest,
      JSONRPCResponse,
      JSONRPCResponse
    >;
    idGen?: IdGen;
    keepAliveTimeoutTime?: number;
    keepAliveIntervalTime?: number;
    rpcCallTimeoutTime?: number;
    rpcParserBufferSize?: number;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(this.constructor.name);
    this.rpcServer = new RPCServer({
      idGen,
      timeoutTime: rpcCallTimeoutTime,
      middlewareFactory: rpcMiddleware.defaultServerMiddlewareWrapper(
        middlewareFactory,
        rpcParserBufferSize,
      ),
      fromError: networkUtils.fromError,
      logger: this.logger.getChild(RPCServer.name),
    });
    this.webSocketServer = new WebSocketServer({
      config: {
        key: tlsConfig.keyPrivatePem,
        cert: tlsConfig.certChainPem,
        keepAliveIntervalTime,
        keepAliveTimeoutTime,
      },
      logger: this.logger.getChild(WebSocketServer.name),
      codeToReason: (type, code) => {
        console.log(code);
        return new Error(`webserver: ${type}: ${code}`);
      },
      reasonToCode: (_, reason) => {
        console.error('webserver:', reason);
        return 0;
      }
    });
  }

  @ready(new errors.ErrorClientServiceNotRunning())
  public get host() {
    return this.webSocketServer.host;
  }

  @ready(new errors.ErrorClientServiceNotRunning())
  public get port() {
    return this.webSocketServer.port;
  }

  public async start({
    manifest,
    host = config.defaultsUser.clientServiceHost,
    port = config.defaultsUser.clientServicePort,
  }: {
    manifest: ServerManifest;
    host?: string;
    port?: number;
  }): Promise<void> {
    this.logger.info(`Start ${this.constructor.name}`);
    await this.rpcServer.start({ manifest });
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
    this.logger.info(`Stop ${this.constructor.name}`);
    await this.webSocketServer.stop({ force });
    this.webSocketServer.removeEventListener(
      wsEvents.EventWebSocketServerConnection.name,
      this.handleEventWebSocketServerConnection,
    );
    await this.rpcServer.stop({ force: true });
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  @ready(new errors.ErrorClientServiceNotRunning())
  public setTlsConfig(tlsConfig: TLSConfig): void {
    this.webSocketServer.updateConfig({
      key: tlsConfig.keyPrivatePem,
      cert: tlsConfig.certChainPem,
    });
  }
}

export default ClientService;
