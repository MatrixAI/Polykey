import type { FileSystem } from '../types';
import type { SessionToken, SessionCredentials } from './types';

import path from 'path';
import Logger from '@matrixai/logger';
import lockfile from 'proper-lockfile';

import * as utils from '../utils';
import * as grpc from '@grpc/grpc-js';
import * as sessionErrors from './errors';

/**
 * Represents a client's session
 */
class Session {
  private fs: FileSystem;
  private logger: Logger;
  private _token: SessionToken;

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
  public async start({ token }: { token?: SessionToken } = {}) {
    if (token == null) {
      token = await this.readToken();
    }
    if (token != null) {
      this.logger.debug('DEBUG');
      this.logger.info('Starting Session');
      this._token = token;
      await this.writeToken();
      this.logger.info('Started Session');
    }
  }

  public async stop() {
    if (!this.token || this.token === '') {
      return;
    }
    this.logger.info('Stopping Session');
    this._token = '' as SessionToken;
    this.logger.info('Stopped Session');
  }

  public get token(): SessionToken {
    return this._token;
  }

  public sessionMetadataGenerator(_params, callback, _metadata?) {
    const metadata = _metadata ?? new grpc.Metadata();
    if (this.token) {
      // Provides token if token exists.
      metadata.add('Authorization', `Bearer: ${this.token}`);
    }
    callback(null, metadata);
  }

  /**
   * Generates a grpc.CallOption using the token in this session.
   * @throws ErrorSessionNotStarted when the session has not started.
   * @returns Promise of a grpc.CallOption with the credentials field.
   */
  // public async createCallCredentials(): Promise<Partial<grpc.CallOptions>> {
  public async createCallCredentials(): Promise<SessionCredentials> {
    if (!this.token || this.token === '') {
      return {} as SessionCredentials;
    }
    return {
      credentials: grpc.CallCredentials.createFromMetadataGenerator(
        this.sessionMetadataGenerator,
      ),
    } as SessionCredentials;
  }

  /**
   * Attempts to read the token in the sessionFile
   * @returns the token, or undefined if token is not found
   */
  public async readToken(): Promise<SessionToken | undefined> {
    try {
      this.logger.info('Reading session token');
      const token = await this.fs.promises.readFile(this.sessionFile);
      return token.toString() as SessionToken;
    } catch (err) {
      this.logger.info('No session token found');
      return;
    }
  }

  /**
   * Writes the current token stored in this session into the sessionFile
   */
  public async writeToken() {
    if (!this.token || this.token === '') {
      this.logger.info('No token provided, skipping writing token to file.');
      return;
      // Should just do nothing.
      // throw new sessionErrors.ErrorSessionNotStarted(
      //   'No token, cannot write to file.',
      // );
    }
    this.logger.info(`Writing token to ${this.sessionFile}`);
    await utils.mkdirExists(this.fs, this.clientPath, { recursive: true });

    try {
      if (await lockfile.check(this.sessionFile, { fs: this.fs })) {
        return;
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        await this.fs.promises.writeFile(this.sessionFile, this._token);
        return;
      }
      throw err;
    }

    await lockfile.lock(this.sessionFile);
    await this.fs.promises.writeFile(this.sessionFile, this._token);
    await lockfile.unlock(this.sessionFile);
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

  /**
   * Update, and write this session's SessionToken
   */
  public async refresh(token: SessionToken) {
    this._token = token;
    await this.writeToken();
  }
}

export default Session;
