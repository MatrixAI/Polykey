import type { FileSystem, Timer } from './types';
import type { NodeId } from './ids/types';
import type { Host, Port } from './network/types';
import path from 'path';
import Logger from '@matrixai/logger';
import { CreateDestroyStartStop } from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { Session } from './sessions';
import { GRPCClientClient } from './client';
import * as errors from './errors';
import * as utils from './utils';
import config from './config';

/**
 * This PolykeyClient would create a new PolykeyClient object that constructs
 * a new GRPCClientClient which attempts to connect to an existing PolykeyAgent's
 * grpc server.
 */
interface PolykeyClient extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new errors.ErrorPolykeyClientRunning(),
  new errors.ErrorPolykeyClientDestroyed(),
)
class PolykeyClient {
  static async createPolykeyClient({
    nodeId,
    host,
    port,
    nodePath = config.defaults.nodePath,
    session,
    grpcClient,
    timer,
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
    grpcClient?: GRPCClientClient;
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
    grpcClient =
      grpcClient ??
      (await GRPCClientClient.createGRPCClientClient({
        nodeId,
        host,
        port,
        tlsConfig: { keyPrivatePem: undefined, certChainPem: undefined },
        session,
        timer,
        logger: logger.getChild(GRPCClientClient.name),
      }));
    const pkClient = new this({
      nodePath,
      grpcClient,
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
  public readonly grpcClient: GRPCClientClient;

  protected fs: FileSystem;
  protected logger: Logger;

  constructor({
    nodePath,
    session,
    grpcClient,
    fs,
    logger,
  }: {
    nodePath: string;
    grpcClient: GRPCClientClient;
    session: Session;
    fs: FileSystem;
    logger: Logger;
  }) {
    this.logger = logger;
    this.nodePath = nodePath;
    this.session = session;
    this.grpcClient = grpcClient;
    this.fs = fs;
  }

  public async start(): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    await this.grpcClient.destroy();
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
