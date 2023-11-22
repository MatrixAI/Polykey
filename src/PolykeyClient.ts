import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { ContextTimed, ContextTimedInput } from '@matrixai/contexts';
import type { DeepPartial, FileSystem } from './types';
import type { OverrideRPClientType } from './client/types';
import type { NodeId } from './ids/types';
import path from 'path';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { timedCancellable, context } from '@matrixai/contexts/dist/decorators';
import { WebSocketClient } from '@matrixai/ws';
import { RPCClient, middleware as rpcMiddleware } from '@matrixai/rpc';
import { Session } from './sessions';
import * as ids from './ids';
import * as utils from './utils';
import * as errors from './errors';
import * as events from './events';
import * as networkUtils from './network/utils';
import * as validationErrors from './validation/errors';
import * as clientUtils from './client/utils';
import * as clientMiddleware from './client/middleware';
import clientClientManifest from './client/callers';
import config from './config';

/**
 * Optional configuration for`PolykeyClient`.
 */
type PolykeyClientOptions = {
  nodePath: string;
  keepAliveTimeoutTime: number;
  keepAliveIntervalTime: number;
  rpcCallTimeoutTime: number;
  rpcParserBufferSize: number;
};

interface PolykeyClient extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new errors.ErrorPolykeyClientRunning(),
  new errors.ErrorPolykeyClientDestroyed(),
  {
    eventStart: events.EventPolykeyClientStart,
    eventStarted: events.EventPolykeyClientStarted,
    eventStop: events.EventPolykeyClientStop,
    eventStopped: events.EventPolykeyClientStopped,
    eventDestroy: events.EventPolykeyClientDestroy,
    eventDestroyed: events.EventPolykeyClientDestroyed,
  },
)
class PolykeyClient {
  /**
   * Creates a Polykey Client.
   *
   * @param opts
   * @param opts.nodeId
   * @param opts.host
   * @param opts.port
   * @param ctx
   */
  public static createPolykeyClient(
    opts: {
      nodeId: string | NodeId;
      host: string;
      port: number;
      options?: DeepPartial<PolykeyClientOptions>;
      fresh?: boolean;
      fs?: FileSystem;
      logger?: Logger;
    },
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<PolykeyClient>;
  @timedCancellable(
    true,
    config.defaultsSystem.clientConnectTimeoutTime,
    errors.ErrorPolykeyClientCreateTimeout,
  )
  public static async createPolykeyClient(
    {
      // Required parameters
      nodeId,
      host,
      port,
      // Options
      options = {},
      fresh = false,
      // Optional dependencies
      fs = require('fs'),
      logger = new Logger(this.name),
    }: {
      nodeId: string | NodeId;
      host: string;
      port: number;
      options?: DeepPartial<PolykeyClientOptions>;
      fresh?: boolean;
      fs?: FileSystem;
      logger?: Logger;
    },
    @context ctx: ContextTimed,
  ): Promise<PolykeyClient> {
    logger.info(`Creating ${this.name}`);
    const optionsDefaulted = utils.mergeObjects(options, {
      nodePath: config.defaultsUser.nodePath,
      connectTimeoutTime: config.defaultsSystem.clientConnectTimeoutTime,
      keepAliveTimeoutTime: config.defaultsSystem.clientKeepAliveTimeoutTime,
      keepAliveIntervalTime: config.defaultsSystem.clientKeepAliveIntervalTime,
      callTimeoutTime: config.defaultsSystem.rpcCallTimeoutTime,
      parserBufferSize: config.defaultsSystem.rpcParserBufferSize,
    }) as PolykeyClientOptions;
    if (optionsDefaulted.nodePath == null) {
      throw new errors.ErrorUtilsNodePath();
    }
    await utils.mkdirExists(fs, optionsDefaulted.nodePath);
    const sessionTokenPath = path.join(
      optionsDefaulted.nodePath,
      config.paths.tokenBase,
    );
    const session = await Session.createSession({
      sessionTokenPath,
      logger: logger.getChild(Session.name),
      fresh,
    });
    const pkClient = new this({
      nodePath: optionsDefaulted.nodePath,
      session,
      fs,
      logger,
    });
    await pkClient.start(
      {
        nodeId,
        host,
        port,
        options: {
          keepAliveTimeoutTime: optionsDefaulted.keepAliveTimeoutTime,
          keepAliveIntervalTime: optionsDefaulted.keepAliveIntervalTime,
          rpcCallTimeoutTime: optionsDefaulted.rpcCallTimeoutTime,
          rpcParserBufferSize: optionsDefaulted.rpcParserBufferSize,
        },
        fresh,
      },
      ctx,
    );
    logger.info(`Created ${this.name}`);
    return pkClient;
  }

  public readonly nodePath: string;
  public readonly session: Session;

  protected fs: FileSystem;
  protected logger: Logger;
  protected _nodeId: NodeId;
  protected _webSocketClient: WebSocketClient;
  protected _rpcClient: OverrideRPClientType<
    RPCClient<typeof clientClientManifest>
  >;

  constructor({
    nodePath,
    session,
    fs,
    logger,
  }: {
    nodePath: string;
    session: Session;
    fs: FileSystem;
    logger: Logger;
  }) {
    this.logger = logger;
    this.nodePath = nodePath;
    this.session = session;
    this.fs = fs;
  }

  @ready(new errors.ErrorPolykeyClientNotRunning())
  public get nodeId() {
    return this._nodeId;
  }

  @ready(new errors.ErrorPolykeyClientNotRunning())
  public get webSocketClient() {
    return this._webSocketClient;
  }

  @ready(new errors.ErrorPolykeyClientNotRunning())
  public get rpcClient() {
    return this._rpcClient;
  }

  @ready(new errors.ErrorPolykeyClientNotRunning())
  public get host() {
    return this._webSocketClient.connection.remoteHost;
  }

  @ready(new errors.ErrorPolykeyClientNotRunning())
  public get port() {
    return this._webSocketClient.connection.remotePort;
  }

  @ready(new errors.ErrorPolykeyClientNotRunning())
  public get localHost() {
    return this._webSocketClient.connection.localHost;
  }

  @ready(new errors.ErrorPolykeyClientNotRunning())
  public get localPort() {
    return this._webSocketClient.connection.localPort;
  }

  public start(
    opts: {
      nodeId: string | NodeId;
      host: string;
      port: number;
      options?: DeepPartial<{
        keepAliveTimeoutTime: number;
        keepAliveIntervalTime: number;
        rpcCallTimeoutTime: number;
        rpcParserBufferSize: number;
      }>;
      fresh?: boolean;
    },
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<void>;
  @timedCancellable(
    true,
    config.defaultsSystem.clientConnectTimeoutTime,
    errors.ErrorPolykeyClientCreateTimeout,
  )
  public async start(
    {
      nodeId,
      host,
      port,
      options = {},
      fresh = false,
    }: {
      nodeId: string | NodeId;
      host: string;
      port: number;
      options?: DeepPartial<{
        keepAliveTimeoutTime: number;
        keepAliveIntervalTime: number;
        rpcCallTimeoutTime: number;
        rpcParserBufferSize: number;
      }>;
      fresh?: boolean;
    },
    @context ctx: ContextTimed,
  ): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    const optionsDefaulted = utils.mergeObjects(options, {
      keepAliveTimeoutTime: config.defaultsSystem.clientKeepAliveTimeoutTime,
      keepAliveIntervalTime: config.defaultsSystem.clientKeepAliveIntervalTime,
      rpcCallTimeoutTime: config.defaultsSystem.rpcCallTimeoutTime,
      rpcParserBufferSize: config.defaultsSystem.rpcParserBufferSize,
    });
    let nodeId_: NodeId;
    if (typeof nodeId === 'string') {
      try {
        nodeId_ = ids.parseNodeId(nodeId);
      } catch (e) {
        if (e instanceof validationErrors.ErrorParse) {
          throw new errors.ErrorPolykeyClientNodeIdInvalid(
            'Encoded node ID must be a multibase base32hex encoded public-key',
            {
              cause: e,
              data: { nodeId },
            },
          );
        }
        throw e;
      }
    } else {
      nodeId_ = nodeId;
    }
    await this.session.start({ fresh });
    const webSocketClient = await WebSocketClient.createWebSocketClient(
      {
        host,
        port,
        config: {
          verifyPeer: true,
          verifyCallback: async (certs) => {
            await clientUtils.verifyServerCertificateChain([nodeId_], certs);
          },
          keepAliveTimeoutTime: optionsDefaulted.keepAliveTimeoutTime,
          keepAliveIntervalTime: optionsDefaulted.keepAliveIntervalTime,
        },
        logger: this.logger.getChild(WebSocketClient.name),
      },
      ctx,
    );
    const rpcClient = new RPCClient({
      manifest: clientClientManifest,
      streamFactory: () => webSocketClient.connection.newStream(),
      middlewareFactory: rpcMiddleware.defaultClientMiddlewareWrapper(
        clientMiddleware.middlewareClient(this.session),
        optionsDefaulted.rpcParserBufferSize,
      ),
      toError: networkUtils.toError,
      timeoutTime: optionsDefaulted.rpcCallTimeoutTime,
      logger: this.logger.getChild(RPCClient.name),
    });
    this._nodeId = nodeId_;
    this._webSocketClient = webSocketClient;
    this._rpcClient = rpcClient as typeof this._rpcClient;
    this.logger.info(`Started ${this.constructor.name}`);
  }

  /**
   * Stops Polykey Client
   *
   * Stopping can force destruction of the websocket client.
   * Prefer not forcing for a graceful stop.
   * Stopping the session does not destroy the session state.
   */
  public async stop({ force = false }: { force?: boolean } = {}) {
    this.logger.info(`Stopping ${this.constructor.name}`);
    await this._webSocketClient.destroy({ force });
    await this.session.stop();
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  /**
   * Destroys Polykey Client
   *
   * This will destroy the session state.
   */
  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.session.destroy();
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }
}

export default PolykeyClient;

export type { PolykeyClientOptions };
