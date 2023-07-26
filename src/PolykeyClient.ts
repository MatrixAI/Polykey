import type { FileSystem } from './types';
import type { StreamFactory } from './rpc/types';
import path from 'path';
import Logger from '@matrixai/logger';
import { CreateDestroyStartStop } from '@matrixai/async-init/dist/CreateDestroyStartStop';
import RPCClient from './rpc/RPCClient';
import * as rpcUtilsMiddleware from './rpc/utils/middleware';
import * as clientUtilsMiddleware from './client/utils/middleware';
import { Session } from './sessions';
import * as errors from './errors';
import * as utils from './utils';
import config from './config';
import { clientManifest } from './client/handlers/clientManifest';

/**
 * This PolykeyClient would create a new PolykeyClient object that constructs
 * a new RPCClient which attempts to connect to an existing PolykeyAgent's
 * RPC server.
 */
interface PolykeyClient extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new errors.ErrorPolykeyClientRunning(),
  new errors.ErrorPolykeyClientDestroyed(),
)
class PolykeyClient {
  static async createPolykeyClient({
    nodePath = config.defaults.nodePath,
    session,
    rpcClientClient,
    streamFactory,
    streamKeepAliveTimeoutTime,
    parserBufferByteLimit,
    fs = require('fs'),
    logger = new Logger(this.name),
    fresh = false,
  }: {
    nodePath?: string;
    session?: Session;
    rpcClientClient?: RPCClient<typeof clientManifest>;
    streamFactory: StreamFactory;
    streamKeepAliveTimeoutTime?: number;
    parserBufferByteLimit?: number;
    fs?: FileSystem;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<PolykeyClient> {
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
    const rpcClientClient_ =
      rpcClientClient ??
      (await RPCClient.createRPCClient({
        manifest: clientManifest,
        streamFactory,
        middlewareFactory: rpcUtilsMiddleware.defaultClientMiddlewareWrapper(
          clientUtilsMiddleware.middlewareClient(session),
          parserBufferByteLimit,
        ),
        streamKeepAliveTimeoutTime,
        logger: logger.getChild(RPCClient.name),
      }));
    const pkClient = new this({
      nodePath,
      rpcClientClient: rpcClientClient_,
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
  public readonly rpcClientClient: RPCClient<typeof clientManifest>;

  protected fs: FileSystem;
  protected logger: Logger;

  constructor({
    nodePath,
    rpcClientClient,
    session,
    fs,
    logger,
  }: {
    nodePath: string;
    rpcClientClient: RPCClient<typeof clientManifest>;
    session: Session;
    fs: FileSystem;
    logger: Logger;
  }) {
    this.logger = logger;
    this.nodePath = nodePath;
    this.session = session;
    this.rpcClientClient = rpcClientClient;
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
    await this.rpcClientClient.destroy();
    await this.session.destroy();
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }
}

export default PolykeyClient;
