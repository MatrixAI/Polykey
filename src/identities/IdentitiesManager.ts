import type {
  ProviderId,
  IdentityId,
  ProviderTokens,
  TokenData,
} from './types';
import type { DB, DBLevel } from '@matrixai/db';
import type Provider from './Provider';

import { Mutex } from 'async-mutex';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import * as identitiesErrors from './errors';

interface IdentitiesManager extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new identitiesErrors.ErrorIdentitiesManagerRunning(),
  new identitiesErrors.ErrorIdentitiesManagerDestroyed(),
)
class IdentitiesManager {
  protected logger: Logger;
  protected db: DB;
  protected identitiesDbDomain: string = this.constructor.name;
  protected identitiesTokensDbDomain: Array<string> = [
    this.identitiesDbDomain,
    'tokens',
  ];
  protected identitiesDb: DBLevel;
  protected identitiesTokensDb: DBLevel;
  protected lock: Mutex = new Mutex();
  protected providers: Map<ProviderId, Provider> = new Map();

  static async createIdentitiesManager({
    db,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    logger: Logger;
    fresh?: boolean;
  }): Promise<IdentitiesManager> {
    logger.info(`Creating ${this.name}`);
    const identitiesManager = new IdentitiesManager({ db, logger });
    await identitiesManager.start({ fresh });
    logger.info(`Created ${this.name}`);
    return identitiesManager;
  }

  constructor({ db, logger }: { db: DB; logger: Logger }) {
    this.logger = logger;
    this.db = db;
  }

  get locked(): boolean {
    return this.lock.isLocked();
  }

  public async start({ fresh = false }: { fresh?: boolean } = {}) {
    this.logger.info(`Starting ${this.constructor.name}`);
    const identitiesDb = await this.db.level(this.identitiesDbDomain);
    // Tokens stores ProviderId -> ProviderTokens
    const identitiesTokensDb = await this.db.level(
      this.identitiesTokensDbDomain[1],
      identitiesDb,
    );
    if (fresh) {
      await identitiesDb.clear();
      this.providers = new Map();
    }
    this.identitiesDb = identitiesDb;
    this.identitiesTokensDb = identitiesTokensDb;
    this.logger.info(`Started ${this.constructor.name}`);
  }

  async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    const identitiesDb = await this.db.level(this.identitiesDbDomain);
    await identitiesDb.clear();
    this.providers = new Map();
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Run several operations within the same lock
   * This does not ensure atomicity of the underlying database
   * Database atomicity still depends on the underlying operation
   */
  public async transaction<T>(
    f: (identitiesManager: IdentitiesManager) => Promise<T>,
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

  @ready(new identitiesErrors.ErrorIdentitiesManagerNotRunning())
  public getProviders(): Record<ProviderId, Provider> {
    return Object.fromEntries(this.providers);
  }

  @ready(new identitiesErrors.ErrorIdentitiesManagerNotRunning())
  public getProvider(pId: ProviderId): Provider | undefined {
    return this.providers.get(pId);
  }

  @ready(new identitiesErrors.ErrorIdentitiesManagerNotRunning())
  public registerProvider(p: Provider): void {
    if (this.providers.has(p.id)) {
      throw new identitiesErrors.ErrorProviderDuplicate();
    }
    p.setTokenDb(
      () => this.getTokens(p.id),
      (identityId) => this.getToken(p.id, identityId),
      (identityId, tokenValue) => this.putToken(p.id, identityId, tokenValue),
      (identityId) => this.delToken(p.id, identityId),
    );
    this.providers.set(p.id, p);
  }

  @ready(new identitiesErrors.ErrorIdentitiesManagerNotRunning())
  public unregisterProvider(pId: ProviderId): void {
    this.providers.delete(pId);
  }

  @ready(new identitiesErrors.ErrorIdentitiesManagerNotRunning())
  public async getTokens(providerId: ProviderId): Promise<ProviderTokens> {
    return await this._transaction(async () => {
      const providerTokens = await this.db.get<ProviderTokens>(
        this.identitiesTokensDbDomain,
        providerId,
      );
      if (providerTokens == null) {
        return {};
      }
      return providerTokens;
    });
  }

  @ready(new identitiesErrors.ErrorIdentitiesManagerNotRunning())
  public async getToken(
    providerId: ProviderId,
    identityId: IdentityId,
  ): Promise<TokenData | undefined> {
    return await this._transaction(async () => {
      const providerTokens = await this.db.get<ProviderTokens>(
        this.identitiesTokensDbDomain,
        providerId,
      );
      if (providerTokens == null) {
        return undefined;
      }
      return providerTokens[identityId];
    });
  }

  @ready(new identitiesErrors.ErrorIdentitiesManagerNotRunning())
  public async putToken(
    providerId: ProviderId,
    identityId: IdentityId,
    tokenData: TokenData,
  ): Promise<void> {
    return await this._transaction(async () => {
      const providerTokens = await this.getTokens(providerId);
      providerTokens[identityId] = tokenData;
      await this.db.put(
        this.identitiesTokensDbDomain,
        providerId,
        providerTokens,
      );
    });
  }

  @ready(new identitiesErrors.ErrorIdentitiesManagerNotRunning())
  public async delToken(
    providerId: ProviderId,
    identityId: IdentityId,
  ): Promise<void> {
    return await this._transaction(async () => {
      const providerTokens = await this.getTokens(providerId);
      if (!(identityId in providerTokens)) {
        return;
      }
      delete providerTokens[identityId];
      if (!Object.keys(providerTokens).length) {
        await this.db.del(this.identitiesTokensDbDomain, providerId);
        return;
      }
      await this.db.put(
        this.identitiesTokensDbDomain,
        providerId,
        providerTokens,
      );
    });
  }
}

export default IdentitiesManager;
