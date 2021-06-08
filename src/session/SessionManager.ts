import type { FileSystem } from '../types';

import Logger from '@matrixai/logger';
import * as errors from './errors';
import { KeyManager, utils as keyUtils, errors as keyErrors } from '../keys';

class SessionManager {
  private _started: boolean;
  private _sessionStarted: boolean;
  private _timeout: NodeJS.Timeout;

  private sessionDuration: number;
  private keyManager: KeyManager;

  private fs: FileSystem;
  private logger: Logger;

  /**
   * Construct a SessionManager object
   * @param logger Logger
   */
  constructor({
    keyManager,
    fs,
    logger,
  }: {
    keyManager: KeyManager;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.keyManager = keyManager;
    this._started = false;
    this._sessionStarted = false;
    this.fs = fs ?? require('fs');
    this.logger = logger ?? new Logger('VaultManager');
  }

  /**
   * Start the SessionManager object
   */
  public async start({
    sessionDuration = 600000,
  }: {
    sessionDuration?: number;
  }) {
    this._started = true;
    this._sessionStarted = false;
    this.sessionDuration = sessionDuration;
  }

  /**
   * Stop the SessionManager object
   */
  public async stop() {
    if (this._timeout) {
      clearTimeout(this._timeout);
    }
    await this.stopSession();
    this._started = false;
  }

  /**
   * If the SessionManager has been started. Not if the session is active
   */
  public get started(): boolean {
    return this._started;
  }

  /**
   * Attempts to start a session.
   * @param password password to start session with
   */
  public async startSession(password: string) {
    if (!this.started) {
      throw new errors.ErrorSessionManagerNotStarted();
    }

    let privateKeyPem;

    try {
      privateKeyPem = await this.fs.promises.readFile(
        this.keyManager.rootKeyPath,
        { encoding: 'utf8' },
      );
    } catch (e) {
      throw new keyErrors.ErrorRootKeysRead(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }

    try {
      keyUtils.decryptPrivateKey(privateKeyPem, password);
    } catch (e) {
      throw new errors.ErrorPassword('Incorrect Password');
    }

    this.logger.info('Session Started');
    this._sessionStarted = true;

    if (this._timeout) {
      clearTimeout(this._timeout);
    }
    this._timeout = setTimeout(async () => {
      await this.stopSession();
    }, this.sessionDuration);
  }

  /**
   * Stops the session
   */
  public async stopSession() {
    if (!this.started) {
      throw new errors.ErrorSessionManagerNotStarted();
    }
    this.logger.info('Session Stopped');
    this._sessionStarted = false;
  }

  /**
   * Gets sessionStarted
   */
  public get sessionStarted(): boolean {
    return this._sessionStarted;
  }
}

export default SessionManager;
