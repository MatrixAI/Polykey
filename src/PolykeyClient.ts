import type { FileSystem } from './types';
import type { ClientManifest, StreamFactory } from './rpc/types';
import path from 'path';
import Logger from '@matrixai/logger';
import { CreateDestroyStartStop } from '@matrixai/async-init/dist/CreateDestroyStartStop';
import RPCClient from './rpc/RPCClient';
import * as middlewareUtils from './rpc/utils/middleware';
import * as authMiddleware from './client/utils/authenticationMiddleware';
import { Session } from './sessions';
import * as errors from './errors';
import * as utils from './utils';
import config from './config';

/**
 * This PolykeyClient would create a new PolykeyClient object that constructs
 * a new RPCClient which attempts to connect to an existing PolykeyAgent's
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
    nodePath = config.defaults.nodePath,
    session,
    manifest,
    streamFactory,
    fs = require('fs'),
    logger = new Logger(this.name),
    fresh = false,
  }: {
    nodePath?: string;
    session?: Session;
    manifest: M;
    streamFactory: StreamFactory;
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
    const rpcClient = await RPCClient.createRPCClient<M>({
      manifest,
      streamFactory,
      middleware: middlewareUtils.defaultClientMiddlewareWrapper(
        authMiddleware.authenticationMiddlewareClient(session),
      ),
      logger: logger.getChild(RPCClient.name),
    });
    const pkClient = new this({
      nodePath,
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
  public readonly rpcClient: RPCClient<M>;

  protected fs: FileSystem;
  protected logger: Logger;

  constructor({
    nodePath,
    rpcClient,
    session,
    fs,
    logger,
  }: {
    nodePath: string;
    rpcClient: RPCClient<M>;
    session: Session;
    fs: FileSystem;
    logger: Logger;
  }) {
    this.logger = logger;
    this.nodePath = nodePath;
    this.session = session;
    this.rpcClient = rpcClient;
    this.fs = fs;
  }

  public async start(): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    await this.session.stop();
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.rpcClient.destroy();
    await this.session.destroy();
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }
}

export default PolykeyClient;
