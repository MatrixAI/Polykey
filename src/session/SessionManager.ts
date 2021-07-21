import type { SessionToken } from './types';

import * as sessionErrors from './errors';

import Logger from '@matrixai/logger';

import { DB } from '../db';
import { Mutex } from 'async-mutex';
import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';
import { utils as keyUtils } from '../keys';
import { generateUserToken } from '../utils';
import { ErrorKeyManagerNotStarted } from '../errors';
import { createPrivateKey, createPublicKey } from 'crypto';

/**
 * Manages the 'Session' in polykey
 */
class SessionManager {
  private _started: boolean;
  private _db: DB;
  private _bits: number;
  private logger: Logger;

  protected lock: Mutex = new Mutex();

  /**
   * Construct a SessionManager object
   * @param logger Logger
   */
  constructor({ db, logger }: { db: DB; logger?: Logger }) {
    this._started = false;
    this._db = db;
    this.logger = logger ?? new Logger('SessionManager');
  }

  /**
   * Start the SessionManager object, stores a keyPair in the DB if one
   * is not already stored there.
   */
  public async start({ bits }: { bits: number }) {
    try {
      if (this._started) {
        return;
      }
      this.logger.info('Starting SessionManager');
      this._bits = bits;
      // If db does not contain private key, create one and store it.
      if (
        !(await this._db.get<string>([this.constructor.name], 'privateKey'))
      ) {
        const keyPair = await keyUtils.generateKeyPair(bits);
        this.logger.info('Putting keypair into DB');
        await this._db.put<string>(
          [this.constructor.name],
          'privateKey',
          keyUtils.privateKeyToPem(keyPair.privateKey),
        );
      }

      this._started = true;
      this.logger.info('Started SessionManager');
    } catch (err) {
      this._started = false;
      throw err;
    }
  }

  /**
   * Stop the SessionManager object
   */
  public async stop() {
    if (!this._started) {
      return;
    }
    this.logger.info('Stopping SessionManager');
    this._started = false;
    this.logger.info('Stopped SessionManager');
  }

  /**
   * Creates a new keypair and stores it in the db
   */
  public async refreshKey() {
    await this._transaction(async () => {
      if (!this._started) {
        throw new ErrorKeyManagerNotStarted();
      }
      const keyPair = await keyUtils.generateKeyPair(this._bits);
      this.logger.info('Putting new keypair into DB');
      await this._db.put<string>(
        [this.constructor.name],
        'privateKey',
        keyUtils.privateKeyToPem(keyPair.privateKey),
      );
    });
  }

  /**
   * Generates a JWT token based on the private key in the db
   * @param input refer to https://github.com/panva/jose/blob/cdce59a340b87b681a003ca28a9116c1f11d3f12/docs/classes/jwt_sign.signjwt.md#setexpirationtime
   * @returns
   */
  public async generateJWTToken(input: string | number = '1h') {
    return await this._transaction(async () => {
      if (!this.started) {
        throw new sessionErrors.ErrorSessionManagerNotStarted();
      }
      const payload = {
        token: await generateUserToken(),
      };
      const privateKeyPem = await this._db.get<string>(
        [this.constructor.name],
        'privateKey',
      );
      if (!privateKeyPem) {
        throw new sessionErrors.ErrorReadingPrivateKey();
      }
      const claim = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime(input)
        .sign(createPrivateKey(privateKeyPem));
      return claim as SessionToken;
    });
  }

  /**
   * Verifies a JWT Token based on the public key derived from the private key
   * in the db
   * @throws ErrorSessionJWTTokenInvalid
   * @throws ErrorSessionManaagerNotStarted
   * @param claim
   * @returns
   */
  public async verifyJWTToken(claim: SessionToken) {
    return await this._transaction(async () => {
      if (!this.started) {
        throw new sessionErrors.ErrorSessionManagerNotStarted();
      }

      const privateKeyPem = await this._db.get<string>(
        [this.constructor.name],
        'privateKey',
      );
      if (!privateKeyPem) {
        throw new sessionErrors.ErrorReadingPrivateKey();
      }
      const privateKey = keyUtils.privateKeyFromPem(privateKeyPem);
      const publicKey = keyUtils.publicKeyFromPrivateKey(privateKey);

      const jwtPublicKey = createPublicKey(keyUtils.publicKeyToPem(publicKey));
      try {
        return await jwtVerify(claim, jwtPublicKey);
      } catch (err) {
        throw new sessionErrors.ErrorSessionJWTTokenInvalid();
      }
    });
  }

  /**
   * If the SessionManager has been started.
   */
  public get started(): boolean {
    return this._started;
  }

  public get locked(): boolean {
    return this.lock.isLocked();
  }

  /**
   * Run several operations within the same lock
   * This does not ensure atomicity of the underlying database
   * Database atomicity still depends on the underlying operation
   */
  public async transaction<T>(
    f: (SessionManager: SessionManager) => Promise<T>,
  ): Promise<T> {
    const release = await this.lock.acquire();
    try {
      return await f(this);
    } finally {
      release();
    }
  }

  /**
   * Transaction wrapper that will not lock if the operation was executed
   * within a transaction context
   */
  public async _transaction<T>(f: () => Promise<T>): Promise<T> {
    if (this.lock.isLocked()) {
      return await f();
    } else {
      return await this.transaction(f);
    }
  }
}

export default SessionManager;
