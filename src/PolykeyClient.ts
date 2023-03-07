import type { FileSystem } from './types';
import type { NodeId } from './ids/types';
import type { Host, Port } from './network/types';
import type { ClientManifest } from './RPC/types';
import type { Timer } from '@matrixai/timer';
import path from 'path';
import Logger from '@matrixai/logger';
import { CreateDestroyStartStop } from '@matrixai/async-init/dist/CreateDestroyStartStop';
import RPCClient from './RPC/RPCClient';
import * as middlewareUtils from './RPC/middleware';
import WebSocketClient from './websockets/WebSocketClient';
import * as authMiddleware from './client/authenticationMiddleware';
import { Session } from './sessions';
import * as errors from './errors';
import * as utils from './utils';
import config from './config';

/**
 * This PolykeyClient would create a new PolykeyClient object that constructs
 * a new GRPCClientClient which attempts to connect to an existing PolykeyAgent's
 * grpc server.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- False positive for M
interface PolykeyClient<M extends ClientManifest>
  extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new errors.ErrorPolykeyClientRunning(),
  new errors.ErrorPolykeyClientDestroyed(),
)
class PolykeyClient<M extends ClientManifest> {
  static async createPolykeyClient<M extends ClientManifest>({
    nodeId,
    host,
    port,
    nodePath = config.defaults.nodePath,
    session,
    manifest,
    connectionTimeout,
    pingTimeout,
    fs = require('fs'),
    logger = new Logger(this.name),
    fresh = false,
  }: {
    nodeId: NodeId;
    host: Host;
    port: Port;
    nodePath?: string;
    timer?: Timer;
    session?: Session;
    manifest: M;
    connectionTimeout?: number;
    pingTimeout?: number;
    fs?: FileSystem;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<PolykeyClient<M>> {
    logger.info(`Creating ${this.name}`);
    if (nodePath == null) {
      throw new errors.ErrorUtilsNodePath();
    }
    await utils.mkdirExists(fs, nodePath);
    const sessionTokenPath = path.join(nodePath, config.defaults.tokenBase);
    session =
      session ??
      (await Session.createSession({
        sessionTokenPath,
        logger: logger.getChild(Session.name),
        fresh,
      }));
    const webSocketClient = await WebSocketClient.createWebSocketClient({
      host,
      port,
      expectedNodeIds: [nodeId],
      logger: logger.getChild(WebSocketClient.name),
      connectionTimeout,
      pingTimeout,
    });
    const rpcClient = await RPCClient.createRPCClient<M>({
      manifest,
      streamPairCreateCallback: async () => webSocketClient.startConnection(),
      middleware: middlewareUtils.defaultClientMiddlewareWrapper(
        authMiddleware.authenticationMiddlewareClient(session),
      ),
      logger: logger.getChild(RPCClient.name),
    });
    const pkClient = new this({
      nodePath,
      webSocketClient,
      rpcClient,
      session,
      fs,
      logger,
    });
    await pkClient.start();
    logger.info(`Created ${this.name}`);
    return pkClient;
  }

  public readonly nodePath: string;
  public readonly session: Session;
  public readonly webSocketClient: WebSocketClient;
  public readonly rpcClient: RPCClient<M>;

  protected fs: FileSystem;
  protected logger: Logger;

  constructor({
    nodePath,
    webSocketClient,
    rpcClient,
    session,
    fs,
    logger,
  }: {
    nodePath: string;
    webSocketClient: WebSocketClient;
    rpcClient: RPCClient<M>;
    session: Session;
    fs: FileSystem;
    logger: Logger;
  }) {
    this.logger = logger;
    this.nodePath = nodePath;
    this.session = session;
    this.webSocketClient = webSocketClient;
    this.rpcClient = rpcClient;
    this.fs = fs;
  }

  public async start(): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    await this.webSocketClient.stopConnections();
    await this.session.stop();
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.webSocketClient.destroy(true);
    await this.rpcClient.destroy();
    await this.session.destroy();
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }
}

export default PolykeyClient;
