import type { DB, DBLevel } from '@matrixai/db';
import type { SessionToken } from './types';
import type { KeyManager } from '../keys';

import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { Mutex } from 'async-mutex';
import * as sessionsUtils from './utils';
import * as sessionsErrors from './errors';
import * as keysUtils from '../keys/utils';
import { utils as nodesUtils } from '../nodes';

interface SessionManager extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new sessionsErrors.ErrorSessionManagerRunning(),
  new sessionsErrors.ErrorSessionManagerDestroyed(),
)
class SessionManager {
  static async createSessionManager({
    db,
    keyManager,
    expiry,
    keyBits = 256,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    keyManager: KeyManager;
    expiry?: number;
    keyBits?: 128 | 192 | 256;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<SessionManager> {
    logger.info(`Creating ${this.name}`);
    const sessionManager = new SessionManager({
      db,
      keyManager,
      expiry,
      keyBits,
      logger,
    });
    await sessionManager.start({ fresh });
    logger.info(`Created ${this.name}`);
    return sessionManager;
  }

  public readonly expiry?: number;
  public readonly keyBits: 128 | 192 | 256;

  protected logger: Logger;
  protected db: DB;
  protected keyManager: KeyManager;
  protected sessionsDbDomain: string = this.constructor.name;
  protected sessionsDb: DBLevel;
  protected lock: Mutex = new Mutex();
  protected key: Uint8Array;

  public constructor({
    db,
    keyManager,
    expiry,
    keyBits,
    logger,
  }: {
    db: DB;
    keyManager: KeyManager;
    expiry?: number;
    keyBits: 128 | 192 | 256;
    logger: Logger;
  }) {
    this.logger = logger;
    this.db = db;
    this.keyManager = keyManager;
    this.expiry = expiry;
    this.keyBits = keyBits;
  }

  get locked(): boolean {
    return this.lock.isLocked();
  }

  public async start({
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    const sessionsDb = await this.db.level(this.sessionsDbDomain);
    if (fresh) {
      await sessionsDb.clear();
    }
    const key = await this.setupKey(this.keyBits);
    this.sessionsDb = sessionsDb;
    this.key = key;
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop(): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    const sessionsDb = await this.db.level(this.sessionsDbDomain);
    await sessionsDb.clear();
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Run several operations within the same lock
   * This does not ensure atomicity of the underlying database
   * Database atomicity still depends on the underlying operation
   */
  public async transaction<T>(f: (that: this) => Promise<T>): Promise<T> {
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
  protected async _transaction<T>(f: () => Promise<T>): Promise<T> {
    if (this.locked) {
      return await f();
    } else {
      return await this.transaction(f);
    }
  }

  @ready(new sessionsErrors.ErrorSessionManagerNotRunning())
  public async resetKey(): Promise<void> {
    await this._transaction(async () => {
      const key = await this.generateKey(this.keyBits);
      await this.db.put([this.sessionsDbDomain], 'key', key, true);
      this.key = key;
    });
  }

  /**
   * Creates session token
   * This is not blocked by key reset
   * @param expiry Seconds from now or default
   */
  @ready(new sessionsErrors.ErrorSessionManagerNotRunning())
  public async createToken(
    expiry: number | undefined = this.expiry,
  ): Promise<SessionToken> {
    const payload = {
      iss: nodesUtils.encodeNodeId(this.keyManager.getNodeId()),
      sub: nodesUtils.encodeNodeId(this.keyManager.getNodeId()),
    };
    const token = await sessionsUtils.createSessionToken(
      payload,
      this.key,
      expiry,
    );
    return token;
  }

  @ready(new sessionsErrors.ErrorSessionManagerNotRunning())
  public async verifyToken(token: SessionToken): Promise<boolean> {
    const result = await sessionsUtils.verifySessionToken(token, this.key);
    return result !== undefined;
  }

  protected async setupKey(bits: 128 | 192 | 256): Promise<Buffer> {
    let key: Buffer | undefined;
    key = await this.db.get([this.sessionsDbDomain], 'key', true);
    if (key != null) {
      return key;
    }
    this.logger.info('Generating sessions key');
    key = await this.generateKey(bits);
    await this.db.put([this.sessionsDbDomain], 'key', key, true);
    return key;
  }

  protected async generateKey(bits: 128 | 192 | 256): Promise<Buffer> {
    return await keysUtils.generateKey(bits);
  }
}

export default SessionManager;
