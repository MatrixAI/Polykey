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
import * as identitiesErrors from './errors';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';

interface IdentitiesManager extends CreateDestroy {}
@CreateDestroy()
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
    logger,
    fresh = false,
  }: {
    db: DB;
    logger: Logger;
    fresh?: boolean;
  }): Promise<IdentitiesManager> {
    const logger_ = logger ?? new Logger(this.constructor.name);
    const identitiesManager = new IdentitiesManager({ db, logger: logger_ });
    await identitiesManager.create({ fresh });
    return identitiesManager;
  }

  constructor({ db, logger }: { db: DB; logger: Logger }) {
    this.logger = logger;
    this.db = db;
  }

  get locked(): boolean {
    return this.lock.isLocked();
  }

  private async create({ fresh }: { fresh: boolean }) {
    this.logger.info('Starting Identities Manager');
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
    this.logger.info('Started Identities Manager');
  }

  async destroy() {
    this.logger.info('Destroyed Identities Manager');
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

  @ready(new identitiesErrors.ErrorIdentitiesManagerDestroyed())
  public getProviders(): Record<ProviderId, Provider> {
    return Object.fromEntries(this.providers);
  }

  @ready(new identitiesErrors.ErrorIdentitiesManagerDestroyed())
  public getProvider(pId: ProviderId): Provider | undefined {
    return this.providers.get(pId);
  }

  @ready(new identitiesErrors.ErrorIdentitiesManagerDestroyed())
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

  @ready(new identitiesErrors.ErrorIdentitiesManagerDestroyed())
  public unregisterProvider(pId: ProviderId): void {
    this.providers.delete(pId);
  }

  @ready(new identitiesErrors.ErrorIdentitiesManagerDestroyed())
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

  @ready(new identitiesErrors.ErrorIdentitiesManagerDestroyed())
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

  @ready(new identitiesErrors.ErrorIdentitiesManagerDestroyed())
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

  @ready(new identitiesErrors.ErrorIdentitiesManagerDestroyed())
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
