import type {
  ProviderId,
  IdentityId,
  ProviderTokens,
  ProviderToken,
  IdentitySignedClaim,
} from './types';
import type { DB, DBTransaction, KeyPath, LevelPath } from '@matrixai/db';
import type Provider from './Provider';
import type { SignedClaim } from '../claims/types';
import type { ClaimLinkIdentity } from '../claims/payloads';
import type KeyRing from '../keys/KeyRing';
import type Sigchain from '../sigchain/Sigchain';
import type GestaltGraph from '../gestalts/GestaltGraph';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import Logger from '@matrixai/logger';
import * as identitiesErrors from './errors';
import * as nodesUtils from '../nodes/utils';
import { promise } from '../utils/index';
import { encodeProviderIdentityId } from '../ids';

interface IdentitiesManager extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new identitiesErrors.ErrorIdentitiesManagerRunning(),
  new identitiesErrors.ErrorIdentitiesManagerDestroyed(),
)
class IdentitiesManager {
  static async createIdentitiesManager({
    db,
    sigchain,
    keyRing,
    gestaltGraph,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    sigchain: Sigchain;
    keyRing: KeyRing;
    gestaltGraph: GestaltGraph;
    logger: Logger;
    fresh?: boolean;
  }): Promise<IdentitiesManager> {
    logger.info(`Creating ${this.name}`);
    const identitiesManager = new this({
      db,
      sigchain,
      keyRing,
      gestaltGraph,
      logger,
    });
    await identitiesManager.start({ fresh });
    logger.info(`Created ${this.name}`);
    return identitiesManager;
  }

  protected keyRing: KeyRing;
  protected db: DB;
  protected sigchain: Sigchain;
  protected gestaltGraph: GestaltGraph;
  protected logger: Logger;
  protected identitiesDbPath: LevelPath = [this.constructor.name];
  /**
   * Tokens stores ProviderId -> ProviderTokens
   */
  protected identitiesTokensDbPath: LevelPath = [
    this.constructor.name,
    'tokens',
  ];
  protected providers: Map<ProviderId, Provider> = new Map();

  constructor({
    keyRing,
    db,
    sigchain,
    gestaltGraph,
    logger,
  }: {
    keyRing: KeyRing;
    db: DB;
    sigchain: Sigchain;
    gestaltGraph: GestaltGraph;
    logger: Logger;
  }) {
    this.keyRing = keyRing;
    this.db = db;
    this.sigchain = sigchain;
    this.gestaltGraph = gestaltGraph;
    this.logger = logger;
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
  ): Promise<ProviderToken | undefined> {
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
    providerToken: ProviderToken,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.putToken(providerId, identityId, providerToken, tran),
      );
    }
    const providerTokens = await this.getTokens(providerId);
    providerTokens[identityId] = providerToken;
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

  public async handleClaimIdentity(
    providerId: ProviderId,
    identityId: IdentityId,
  ) {
    // Check provider is authenticated
    const provider = this.getProvider(providerId);
    if (provider == null) {
      throw new identitiesErrors.ErrorProviderMissing();
    }
    const identities = await provider.getAuthIdentityIds();
    if (!identities.includes(identityId)) {
      throw new identitiesErrors.ErrorProviderUnauthenticated();
    }
    // Create identity claim on our node
    const publishedClaimProm = promise<IdentitySignedClaim>();
    await this.db.withTransactionF((tran) =>
      this.sigchain.addClaim(
        {
          typ: 'ClaimLinkIdentity',
          iss: nodesUtils.encodeNodeId(this.keyRing.getNodeId()),
          sub: encodeProviderIdentityId([providerId, identityId]),
        },
        undefined,
        async (token) => {
          // Publishing in the callback to avoid adding bad claims
          const claim = token.toSigned();
          const asd = await provider.publishClaim(
            identityId,
            claim as SignedClaim<ClaimLinkIdentity>,
          );
          publishedClaimProm.resolveP(asd);
          return token;
        },
        tran,
      ),
    );
    const publishedClaim = await publishedClaimProm.p;
    // Publish claim on identity
    const issNodeInfo = {
      nodeId: this.keyRing.getNodeId(),
    };
    const subIdentityInfo = {
      providerId: providerId,
      identityId: identityId,
      url: publishedClaim.url,
    };
    await this.gestaltGraph.linkNodeAndIdentity(issNodeInfo, subIdentityInfo, {
      meta: { providerIdentityClaimId: publishedClaim.id },
      claim: publishedClaim.claim,
    });
    return publishedClaim;
  }
}

export default IdentitiesManager;
