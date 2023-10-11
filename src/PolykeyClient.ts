import type { FileSystem } from './types';
import type { StreamFactory } from '@matrixai/rpc';
import path from 'path';
import Logger from '@matrixai/logger';
import { CreateDestroyStartStop } from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { RPCClient } from '@matrixai/rpc';
import { middleware as rpcMiddleware } from '@matrixai/rpc';
import * as clientMiddleware from './client/middleware';
import { Session } from './sessions';
import * as utils from './utils';
import * as errors from './errors';
import * as events from './events';
import config from './config';
import * as networkUtils from './network/utils';
import clientClientManifest from './client/callers';

/**
 * This PolykeyClient would create a new PolykeyClient object that constructs
 * a new RPCClient which attempts to connect to an existing PolykeyAgent's
 * RPC server.
 */
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
  static async createPolykeyClient({
    nodePath = config.defaultsUser.nodePath,
    streamFactory,
    streamKeepAliveTimeoutTime,
    parserBufferByteLimit,
    fs = require('fs'),
    logger = new Logger(this.name),
    fresh = false,
  }: {
    nodePath?: string;
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
    const sessionTokenPath = path.join(nodePath, config.paths.tokenBase);
    const session = await Session.createSession({
      sessionTokenPath,
      logger: logger.getChild(Session.name),
      fresh,
    });
    const rpcClientClient = new RPCClient({
      manifest: clientClientManifest,
      streamFactory,
      middlewareFactory: rpcMiddleware.defaultClientMiddlewareWrapper(
        clientMiddleware.middlewareClient(session),
        parserBufferByteLimit,
      ),
      toError: networkUtils.toError,
      streamKeepAliveTimeoutTime,
      logger: logger.getChild(RPCClient.name),
    });
    const pkClient = new this({
      nodePath,
      rpcClientClient: rpcClientClient,
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
  public readonly rpcClientClient: RPCClient<typeof clientClientManifest>;

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
    rpcClientClient: RPCClient<typeof clientClientManifest>;
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
    await this.session.destroy();
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }
}

export default PolykeyClient;
