import type { Claim } from '../sigchain/types';
import type { FileSystem } from '../types';

import path from 'path';
import Logger from '@matrixai/logger';

import * as utils from '../utils';
import * as grpc from '@grpc/grpc-js';
import * as sessionErrors from './errors';

/**
 * Represents a client's session
 */
class Session {
  private fs: FileSystem;
  private logger: Logger;
  private _token: Claim;

  public readonly clientPath: string;
  public readonly sessionFile: string;

  /**
   * Construct a Session
   * @param clientPath: the client path
   */
  constructor({
    clientPath,
    fs,
    logger,
  }: {
    clientPath: string;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.fs = fs ?? require('fs');
    this.logger = logger ?? new Logger(this.constructor.name);

    this.clientPath = clientPath;
    this.sessionFile = path.join(this.clientPath, 'token');
  }

  /**
   * Starts the session, given a Claim/token.
   */
  public async start({ token }: { token: Claim }) {
    this.logger.info('Starting Session');
    this._token = token;
    this.logger.info('Started Session');
  }

  public async stop() {
    if (!this.token || this.token === '') {
      return;
    }
    this.logger.info('Stopping Session');
    this._token = '' as Claim;
    this.logger.info('Stopped Session');
  }

  public get token(): Claim {
    return this._token;
  }

  /**
   * Generates a grpc.CallOption using the token in this session.
   * @throws ErrorSessionNotStarted when the session has not started.
   * @returns Promise of a grpc.CallOption with the credentials field.
   */
  public async createJWTCallCredentials(): Promise<Partial<grpc.CallOptions>> {
    if (!this.token || this.token === '') {
      return {};
    }
    return {
      credentials: grpc.CallCredentials.createFromMetadataGenerator(
        (_params, callback) => {
          const meta = new grpc.Metadata();
          meta.add('Authorization', `Bearer: ${this.token}`);
          callback(null, meta);
        },
      ),
    };
  }

  /**
   * Attempts to read the token in the sessionFile
   * @returns the token, or undefined if token is not found
   */
  public async readToken(): Promise<string | undefined> {
    try {
      this.logger.info('Reading session token');
      const token = await this.fs.promises.readFile(this.sessionFile);
      return token.toString();
    } catch (err) {
      return;
    }
  }

  /**
   * Writes the current token stored in this session into the sessionFile
   */
  public async writeToken() {
    if (!this.token || this.token === '') {
      throw new sessionErrors.ErrorSessionNotStarted(
        'No token, cannot write to file.',
      );
    }
    this.logger.info(`Writing token to ${this.sessionFile}`);
    await utils.mkdirExists(this.fs, this.clientPath, { recursive: true });
    this.fs.promises.writeFile(this.sessionFile, this._token);
  }

  /**
   * Clears the token in the file, if file does not exist, exits cleanly
   */
  public async clearFSToken() {
    try {
      this.logger.info(`Clearing token from ${this.sessionFile}`);
      this.fs.promises.writeFile(this.sessionFile, '');
    } catch (err) {
      return;
    }
  }
}

export default Session;
