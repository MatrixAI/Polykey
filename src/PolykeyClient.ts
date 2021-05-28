import type { NodeId } from './nodes/types';

import path from 'path';
import Logger from '@matrixai/logger';
import { ChannelCredentials } from '@grpc/grpc-js';

import { ErrorClientClientNotStarted } from './client/errors';
import { GRPCClientClient } from './client';
import { Lockfile } from './lockfile';
import { FileSystem, LockConfig } from './types';
import * as utils from './utils';
import { ErrorPolykey } from './errors';

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
class PolykeyClient {
  protected _grpcClient: GRPCClientClient;

  public readonly logger: Logger;
  public readonly nodePath: string;
  public readonly fs: FileSystem;
  public readonly grpcHost: string;
  public readonly grpcPort: number;
  public readonly lockPath: string;

  constructor({
    nodePath,
    fs,
    logger,
  }: {
    nodePath?: string;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger('CLI Logger');
    this.nodePath =
      nodePath ?? path.resolve(nodePath ?? utils.getDefaultNodePath());
    this.fs = fs ?? require('fs');
    this.lockPath = path.join(this.nodePath, Lockfile.LOCKFILE_NAME);
  }

  async start({
    timeout,
    host,
    port,
    authToken,
  }: {
    credentials?: ChannelCredentials;
    timeout?: number;
    host?: string;
    port?: number;
    authToken?: string;
  }) {
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
      throw new ErrorPolykey('Could not parse Polykey Lockfile.');
    }

    // create a new GRPCClientClient
    this._grpcClient = new GRPCClientClient({
      nodeId: lock.nodeId as NodeId,
      host: host ?? lock.host ?? 'localhost',
      port: port ?? lock.port ?? 0,
      logger: this.logger,
    });

    await this.grpcClient.start({
      timeout: timeout ?? 30000,
    });

    if (!host && !lock.host) {
      this.logger.warn('PolykeyClient started with default host: localhost');
    }
    if (!port && !lock.port) {
      this.logger.warn('PolykeyClient started with default port: 0');
    }
    if (!authToken) {
      this.logger.warn('PolykeyClient started with no authToken');
    }
  }
  async stop() {
    if (this.grpcClient) {
      await this.grpcClient.stop();
    }
  }

  public get grpcClient(): GRPCClientClient {
    return this._grpcClient;
  }
}

export default PolykeyClient;
