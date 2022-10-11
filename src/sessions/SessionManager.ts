import type { DB, DBTransaction, LevelPath } from '@matrixai/db';
import type { SessionToken } from './types';
import type KeyRing from '../keys/KeyRing';
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
    keyRing,
    expiry,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    keyRing: KeyRing;
    expiry?: number;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<SessionManager> {
    logger.info(`Creating ${this.name}`);
    const sessionManager = new this({
      db,
      keyRing,
      expiry,
      logger,
    });
    await sessionManager.start({ fresh });
    logger.info(`Created ${this.name}`);
    return sessionManager;
  }

  public readonly expiry?: number;

  protected logger: Logger;
  protected db: DB;
  protected keyRing: KeyRing;
  protected sessionsDbPath: LevelPath = [this.constructor.name];

  public constructor({
    db,
    keyRing,
    expiry,
    logger,
  }: {
    db: DB;
    keyRing: KeyRing;
    expiry?: number;
    logger: Logger;
  }) {
    this.logger = logger;
    this.db = db;
    this.keyRing = keyRing;
    this.expiry = expiry;
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
    await this.setupKey();
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
  public async resetKey(tran?: DBTransaction): Promise<void> {
    const tranOrDb = tran ?? this.db;
    const key = keysUtils.generateKey();
    await tranOrDb.put([...this.sessionsDbPath, 'key'], key, true);
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
    const tranOrDb = tran ?? this.db;
    const payload = {
      iss: nodesUtils.encodeNodeId(this.keyRing.getNodeId()),
      sub: nodesUtils.encodeNodeId(this.keyRing.getNodeId()),
    };
    const key = await tranOrDb.get([...this.sessionsDbPath, 'key'], true);
    return await sessionsUtils.createSessionToken(payload, key!, expiry);
  }

  @ready(new sessionsErrors.ErrorSessionManagerNotRunning())
  public async verifyToken(
    token: SessionToken,
    tran?: DBTransaction,
  ): Promise<boolean> {
    const tranOrDb = tran ?? this.db;
    const key = await tranOrDb.get([...this.sessionsDbPath, 'key'], true);
    const result = await sessionsUtils.verifySessionToken(token, key!);
    return result !== undefined;
  }

  protected async setupKey(): Promise<Buffer> {
    return await withF([this.db.transaction()], async ([tran]) => {
      let key: Buffer | undefined;
      key = await tran.get([...this.sessionsDbPath, 'key'], true);
      if (key != null) {
        return key;
      }
      this.logger.info('Generating sessions key');
      key = keysUtils.generateKey();
      await tran.put([...this.sessionsDbPath, 'key'], key, true);
      return key;
    });
  }
}

export default SessionManager;
