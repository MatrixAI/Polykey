import type { DB, DBTransaction, LevelPath } from '@matrixai/db';
import type { SessionToken } from './types';
import type KeyManager from '../keys/KeyManager';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { withF } from '@matrixai/resources';
import * as sessionsUtils from './utils';
import * as sessionsErrors from './errors';
import * as keysUtils from '../keys/utils';
import * as nodesUtils from '../nodes/utils';

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
  protected sessionsDbPath: LevelPath = [this.constructor.name];

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

  public async start({
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      await this.db.clear(this.sessionsDbPath);
    }
    await this.setupKey(this.keyBits);
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop(): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.db.clear(this.sessionsDbPath);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @ready(new sessionsErrors.ErrorSessionManagerNotRunning())
  public async withTransactionF<T>(
    f: (tran: DBTransaction) => Promise<T>,
  ): Promise<T> {
    return withF([this.db.transaction()], ([tran]) => f(tran));
  }

  @ready(new sessionsErrors.ErrorSessionManagerNotRunning())
  public async resetKey(tran?: DBTransaction): Promise<void> {
    if (tran == null) {
      return this.withTransactionF(async (tran) => this.resetKey(tran));
    }
    const key = await this.generateKey(this.keyBits);
    await tran.put([...this.sessionsDbPath, 'key'], key, true);
  }

  /**
   * Creates session token
   * This is not blocked by key reset
   * @param expiry Seconds from now or default
   */
  @ready(new sessionsErrors.ErrorSessionManagerNotRunning())
  public async createToken(
    expiry: number | undefined = this.expiry,
    tran?: DBTransaction,
  ): Promise<SessionToken> {
    if (tran == null) {
      return this.withTransactionF(async (tran) =>
        this.createToken(expiry, tran),
      );
    }
    const payload = {
      iss: nodesUtils.encodeNodeId(this.keyManager.getNodeId()),
      sub: nodesUtils.encodeNodeId(this.keyManager.getNodeId()),
    };
    const key = await tran.get([...this.sessionsDbPath, 'key'], true);
    const token = await sessionsUtils.createSessionToken(payload, key!, expiry);
    return token;
  }

  @ready(new sessionsErrors.ErrorSessionManagerNotRunning())
  public async verifyToken(
    token: SessionToken,
    tran?: DBTransaction,
  ): Promise<boolean> {
    if (tran == null) {
      return this.withTransactionF(async (tran) =>
        this.verifyToken(token, tran),
      );
    }
    const key = await tran.get([...this.sessionsDbPath, 'key'], true);
    const result = await sessionsUtils.verifySessionToken(token, key!);
    return result !== undefined;
  }

  protected async setupKey(bits: 128 | 192 | 256): Promise<Buffer> {
    return withF([this.db.transaction()], async ([tran]) => {
      let key: Buffer | undefined;
      key = await tran.get([...this.sessionsDbPath, 'key'], true);
      if (key != null) {
        return key;
      }
      this.logger.info('Generating sessions key');
      key = await this.generateKey(bits);
      await tran.put([...this.sessionsDbPath, 'key'], key, true);
      return key;
    });
  }

  protected async generateKey(bits: 128 | 192 | 256): Promise<Buffer> {
    return await keysUtils.generateKey(bits);
  }
}

export default SessionManager;
