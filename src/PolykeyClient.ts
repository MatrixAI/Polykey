import type { NodeId } from './nodes/types';
import type { FileSystem, LockConfig } from './types';

import path from 'path';
import Logger from '@matrixai/logger';

import * as utils from './utils';
import { Session } from './sessions';
import { Lockfile, LOCKFILE_NAME } from './lockfile';
import * as errors from './errors';
import { GRPCClientClient } from './client';
import { ErrorClientClientNotStarted } from './client/errors';
import { CreateDestroyStartStop } from '@matrixai/async-init/dist/CreateDestroyStartStop';

/**
 * This PolykeyClient would create a new PolykeyClient object that constructs
 * a new GRPCClientClient which attempts to connect to an existing PolykeyAgent's
 * grpc server.
 *
 * The grpcClient is accessible, and so should be possible to perform tasks like:
 * grpcClient.echo or whatever functions exist.
 *
 * It should read from some lockfile in the nodePath,
 * which is usually the default polykey path
 */
interface PolykeyClient extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new errors.ErrorPolykeyClientNotRunning(),
  new errors.ErrorPolykeyClientDestroyed(),
)
class PolykeyClient {
  protected _grpcClient: GRPCClientClient;

  public readonly logger: Logger;
  public readonly nodePath: string;
  public readonly fs: FileSystem;
  public readonly grpcHost: string;
  public readonly grpcPort: number;
  public readonly lockPath: string;
  public readonly clientPath: string;

  // Session
  public readonly session: Session;

  static async createPolykeyClient({
    nodePath,
    fs,
    logger,
  }: {
    nodePath?: string;
    fs?: FileSystem;
    logger?: Logger;
  }): Promise<PolykeyClient> {
    const fs_ = fs ?? require('fs');
    const logger_ = logger ?? new Logger('CLI Logger');
    const nodePath_ =
      nodePath ?? path.resolve(nodePath ?? utils.getDefaultNodePath());
    const clientPath_ = path.join(nodePath_, 'client');
    const session_ = new Session({
      clientPath: clientPath_,
      logger: logger_,
    });
    return new PolykeyClient({
      fs: fs_,
      logger: logger_,
      nodePath: nodePath_,
      clientPath: clientPath_,
      session: session_,
    });
  }

  constructor({
    nodePath,
    fs,
    logger,
    clientPath,
    session,
  }: {
    nodePath: string;
    fs: FileSystem;
    logger: Logger;
    clientPath: string;
    session: Session;
  }) {
    this.fs = fs;
    this.logger = logger;
    this.nodePath = nodePath;
    this.lockPath = path.join(this.nodePath, LOCKFILE_NAME);
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
  }) {
    this.logger.info('Starting PolykeyClient');
    const status = await Lockfile.checkLock(this.fs, this.lockPath);
    if (status === 'UNLOCKED') {
      throw new ErrorClientClientNotStarted(
        'Polykey Lockfile not locked. Is the PolykeyAgent started?',
      );
    } else if (status === 'DOESNOTEXIST') {
      throw new ErrorClientClientNotStarted(
        'Polykey Lockfile not found. Is the PolykeyAgent started?',
      );
    }

    let lock: LockConfig;
    try {
      lock = await Lockfile.parseLock(this.fs, this.lockPath);
    } catch (err) {
      throw new errors.ErrorPolykey('Could not parse Polykey Lockfile.');
    }

    // Attempt to read token from fs and start session.
    await this.session.start();

    // Create a new GRPCClientClient
    this._grpcClient = await GRPCClientClient.createGRPCCLientClient({
      nodeId: lock.nodeId as NodeId,
      host: host ?? lock.host ?? 'localhost',
      port: port ?? lock.port ?? 0,
      logger: this.logger,
    });

    await this.grpcClient.start({
      timeout: timeout ?? 30000,
      session: this.session,
    });

    if (!host && !lock.host) {
      this.logger.warn('PolykeyClient started with default host: localhost');
    }
    if (!port && !lock.port) {
      this.logger.warn('PolykeyClient started with default port: 0');
    }

    await utils.mkdirExists(this.fs, this.clientPath, { recursive: true });
    this.logger.info('Started PolykeyClient');
  }

  public async stop() {
    this.logger.info('Stopping PolykeyClient');
    if (this.grpcClient) {
      await this.grpcClient.stop();
    }
    this.logger.info('Stopped PolykeyClient');
  }

  public async destroy() {
    this.logger.info('Destroyed PolykeyClient');
  }

  public get grpcClient(): GRPCClientClient {
    return this._grpcClient;
  }
}

export default PolykeyClient;
