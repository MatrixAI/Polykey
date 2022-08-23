import type { ProviderTokens } from './types';
import type { DB, KeyPath, LevelPath } from '@matrixai/db';
import { DBTransaction } from '@matrixai/db';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import Provider from './Provider';
import { ProviderId, IdentityId, TokenData } from './types';
import * as identitiesErrors from './errors';

interface IdentitiesManager extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new identitiesErrors.ErrorIdentitiesManagerRunning(),
  new identitiesErrors.ErrorIdentitiesManagerDestroyed(),
)
class IdentitiesManager {
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
    const identitiesManager = new this({ db, logger });
    await identitiesManager.start({ fresh });
    logger.info(`Created ${this.name}`);
    return identitiesManager;
  }

  protected logger: Logger;
  protected db: DB;
  protected identitiesDbPath: LevelPath = [this.constructor.name];
  /**
   * Tokens stores ProviderId -> ProviderTokens
   */
  protected identitiesTokensDbPath: LevelPath = [
    this.constructor.name,
    'tokens',
  ];
  protected providers: Map<ProviderId, Provider> = new Map();

  constructor({ db, logger }: { db: DB; logger: Logger }) {
    this.logger = logger;
    this.db = db;
  }

  public async start({ fresh = false }: { fresh?: boolean } = {}) {
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      await this.db.clear(this.identitiesDbPath);
      this.providers = new Map();
    }
    this.logger.info(`Started ${this.constructor.name}`);
  }

  async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.db.clear(this.identitiesDbPath);
    this.providers = new Map();
    this.logger.info(`Destroyed ${this.constructor.name}`);
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
  public async getTokens(
    providerId: ProviderId,
    tran?: DBTransaction,
  ): Promise<ProviderTokens> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getTokens(providerId, tran),
      );
    }
    const providerIdPath = [
      ...this.identitiesTokensDbPath,
      providerId,
    ] as unknown as KeyPath;
    const providerTokens = await tran.get<ProviderTokens>(providerIdPath);
    if (providerTokens == null) {
      return {};
    }
    return providerTokens;
  }

  @ready(new identitiesErrors.ErrorIdentitiesManagerNotRunning())
  public async getToken(
    providerId: ProviderId,
    identityId: IdentityId,
    tran?: DBTransaction,
  ): Promise<TokenData | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getToken(providerId, identityId, tran),
      );
    }
    const providerIdPath = [
      ...this.identitiesTokensDbPath,
      providerId,
    ] as unknown as KeyPath;
    const providerTokens = await tran.get<ProviderTokens>(providerIdPath);
    if (providerTokens == null) {
      return undefined;
    }
    return providerTokens[identityId];
  }

  @ready(new identitiesErrors.ErrorIdentitiesManagerNotRunning())
  public async putToken(
    providerId: ProviderId,
    identityId: IdentityId,
    tokenData: TokenData,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.putToken(providerId, identityId, tokenData, tran),
      );
    }
    const providerTokens = await this.getTokens(providerId);
    providerTokens[identityId] = tokenData;
    const providerIdPath = [
      ...this.identitiesTokensDbPath,
      providerId,
    ] as unknown as KeyPath;
    await tran.put(providerIdPath, providerTokens);
  }

  @ready(new identitiesErrors.ErrorIdentitiesManagerNotRunning())
  public async delToken(
    providerId: ProviderId,
    identityId: IdentityId,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.delToken(providerId, identityId, tran),
      );
    }
    const providerTokens = await this.getTokens(providerId, tran);
    if (!(identityId in providerTokens)) {
      return;
    }
    delete providerTokens[identityId];
    const providerIdPath = [
      ...this.identitiesTokensDbPath,
      providerId,
    ] as unknown as KeyPath;
    if (!Object.keys(providerTokens).length) {
      await tran.del(providerIdPath);
      return;
    }
    await tran.put(providerIdPath, providerTokens);
  }
}

export default IdentitiesManager;
