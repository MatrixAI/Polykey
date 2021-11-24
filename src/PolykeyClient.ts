import type { FileSystem, LockConfig } from './types';
import type { NodeId } from './nodes/types';

import path from 'path';
import Logger from '@matrixai/logger';
import { CreateDestroyStartStop } from '@matrixai/async-init/dist/CreateDestroyStartStop';
import * as utils from './utils';
import { Session } from './sessions';
import { Status } from './status';
import * as errors from './errors';
import { GRPCClientClient } from './client';
import { sleep } from './utils';

// 2. client path should be an independent property
// 3. You should be able to start a PK client without actually having access to the node path
// 4. You will need access to all connection properties though

/**
 * This PolykeyClient would create a new PolykeyClient object that constructs
 * a new GRPCClientClient which attempts to connect to an existing PolykeyAgent's
 * grpc server.
 *
 * The grpcClient is accessible, and so should be possible to perform tasks like:
 * grpcClient.echo or whatever functions exist.
 *
 * It should read from some Status file in the nodePath,
 * which is usually the default polykey path
 */
interface PolykeyClient extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new errors.ErrorPolykeyClientRunning(),
  new errors.ErrorPolykeyClientDestroyed(),
)
class PolykeyClient {
  static async createPolykeyClient({
    nodePath,
    clientPath = path.join(nodePath, 'client'),
    session,
    fs = require('fs'),
    logger = new Logger(this.name),
    // Optional start
    timeout,
    host,
    port,
  }: {
    nodePath: string;
    clientPath?: string;
    session?: Session;
    fs?: FileSystem;
    logger?: Logger;
    timeout?: number;
    host?: string;
    port?: number;
  }): Promise<PolykeyClient> {
    logger.info(`Creating ${this.name}`);
    nodePath = path.resolve(nodePath);
    clientPath = path.resolve(clientPath);
    const sessionTokenPath = path.join(clientPath, 'token');
    session =
      session ??
      (await Session.createSession({
        sessionTokenPath,
        logger: logger.getChild(Session.name),
      }));
    const pkClient = new PolykeyClient({
      nodePath,
      clientPath,
      session,
      fs,
      logger,
    });
    await pkClient.start({
      timeout,
      host,
      port,
    });
    logger.info(`Created ${this.name}`);
    return pkClient;
  }

  // Optional parameters are encapsulated parameters
  // the node path is optional?
  // are we sure about this?

  public readonly clientPath: string;
  public readonly nodePath: string;
  public readonly fs: FileSystem;
  public readonly logger: Logger;

  public readonly grpcHost: string;
  public readonly grpcPort: number;
  public readonly session: Session;
  protected _grpcClient: GRPCClientClient;

  constructor({
    nodePath,
    clientPath,
    session,
    fs,
    logger,
  }: {
    nodePath: string;
    clientPath: string;
    session: Session;
    fs: FileSystem;
    logger: Logger;
  }) {
    this.logger = logger;
    this.fs = fs;
    this.nodePath = nodePath;
    this.clientPath = clientPath;
    this.session = session;
  }

  public async start({
    timeout,
    host,
    port,
  }: {
    timeout?: number;
    host?: string;
    port?: number;
  } = {}): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);

    const status = await Status.createStatus({
      nodePath: this.nodePath,
      fs: this.fs,
      logger: this.logger.getChild('Lockfile'),
    });
    let starting = true;
    for (let i = 0; i < 8 && starting; i++) {
      switch (await status.checkStatus()) {
        case 'STARTING':
          await sleep(250);
          continue;
        case 'RUNNING':
          starting = false;
          break;
        case 'STOPPING':
        case 'UNLOCKED':
        default: {
          throw new errors.ErrorPolykey(
            'Polykey Status file not locked. Is the PolykeyAgent started?',
          );
        }
      }
    }

    let lock: LockConfig;
    try {
      lock = await status.parseStatus();
    } catch (err) {
      throw new errors.ErrorPolykey('Could not parse Polykey Lockfile.');
    }

    // Attempt to read token from fs and start session.
    await this.session.start();

    // Create a new GRPCClientClient
    this._grpcClient = await GRPCClientClient.createGRPCClientClient({
      nodeId: lock.nodeId as NodeId,
      host: host ?? lock.host ?? 'localhost',
      port: port ?? lock.port ?? 0,
      timeout: timeout ?? 30000,
      tlsConfig: { keyPrivatePem: undefined, certChainPem: undefined },
      session: this.session,
      logger: this.logger.getChild(GRPCClientClient.name),
    });

    if (!host && !lock.host) {
      this.logger.warn('PolykeyClient started with default host: localhost');
    }
    if (!port && !lock.port) {
      this.logger.warn('PolykeyClient started with default port: 0');
    }

    await utils.mkdirExists(this.fs, this.clientPath);
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    if (this.grpcClient) {
      await this.grpcClient.destroy();
    }
    await this.session.stop();
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);

    // What is a "Session" again
    // it's an object that you start and maintain locks on it
    // you can CreateDestroy it
    // but do you start it?

    // should wipe out the actual session token and client-related data
    // you must call all encapsulated properties
    //
    if (this.grpcClient) {
      await this.grpcClient.destroy();
    }
    await this.session.destroy();

    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  public get grpcClient(): GRPCClientClient {
    return this._grpcClient;
  }
}

export default PolykeyClient;
