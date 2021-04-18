import path from 'path';
import Logger from '@matrixai/logger';
import { ChannelCredentials } from '@grpc/grpc-js';

import { ErrorClientClientNotStarted } from './client/errors';
import { utils as grpcUtls } from './grpc';
import { GRPCClientClient } from './client';
import { FileSystem } from './types';
import * as utils from './utils';

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
    this.fs = fs ?? require('fs/promises');
    this.lockPath = path.join(this.nodePath, 'agent-lock.json');
  }

  async start({
    credentials,
    timeout,
    host,
    port,
  }: {
    credentials?: ChannelCredentials;
    timeout?: number;
    host?: string;
    port?: number;
  }) {
    const lockfile = await utils.parseLock(this.fs, this.lockPath);

    // If Lockfile could not be found, throw error
    if (!lockfile) {
      throw new ErrorClientClientNotStarted(
        'Could not find PolykeyAgent lockfile. Is the PolykeyAgent started?',
      );
    }
    // create a new GRPCClientClient
    this._grpcClient = new GRPCClientClient({
      host: host ?? lockfile.grpcHost,
      port: port ?? lockfile.grpcPort,
      logger: this.logger,
    });

    await this.grpcClient.start({
      credentials: credentials ?? grpcUtls.clientCredentials(),
      timeout: timeout ?? 30000,
    });
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
