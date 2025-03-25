import type {
  ProviderId,
  IdentityId,
  ProviderTokens,
  ProviderToken,
  IdentitySignedClaim,
} from './types.js';
import type { DB, DBTransaction, KeyPath, LevelPath } from '@matrixai/db';
import type Provider from './Provider.js';
import type { ClaimLinkIdentity } from '../claims/payloads/index.js';
import type KeyRing from '../keys/KeyRing.js';
import type Sigchain from '../sigchain/Sigchain.js';
import type GestaltGraph from '../gestalts/GestaltGraph.js';
import { createDestroyStartStop } from '@matrixai/async-init';
import Logger from '@matrixai/logger';
import * as identitiesErrors from './errors.js';
import * as identitiesEvents from './events.js';
import Token from '../tokens/Token.js';
import * as nodesUtils from '../nodes/utils.js';
import { promise } from '../utils/index.js';
import { encodeProviderIdentityId } from '../ids/index.js';

interface IdentitiesManager
  extends createDestroyStartStop.CreateDestroyStartStop {}
@createDestroyStartStop.CreateDestroyStartStop(
  new identitiesErrors.ErrorIdentitiesManagerRunning(),
  new identitiesErrors.ErrorIdentitiesManagerDestroyed(),
  {
    eventStart: identitiesEvents.EventIdentitiesManagerStart,
    eventStarted: identitiesEvents.EventIdentitiesManagerStarted,
    eventStop: identitiesEvents.EventIdentitiesManagerStop,
    eventStopped: identitiesEvents.EventIdentitiesManagerStopped,
    eventDestroy: identitiesEvents.EventIdentitiesManagerDestroy,
    eventDestroyed: identitiesEvents.EventIdentitiesManagerDestroyed,
  },
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

  @createDestroyStartStop.ready(
    new identitiesErrors.ErrorIdentitiesManagerNotRunning(),
  )
  public getProviders(): Record<ProviderId, Provider> {
    return Object.fromEntries(this.providers);
  }

  @createDestroyStartStop.ready(
    new identitiesErrors.ErrorIdentitiesManagerNotRunning(),
  )
  public getProvider(pId: ProviderId): Provider | undefined {
    return this.providers.get(pId);
  }

  @createDestroyStartStop.ready(
    new identitiesErrors.ErrorIdentitiesManagerNotRunning(),
  )
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

  @createDestroyStartStop.ready(
    new identitiesErrors.ErrorIdentitiesManagerNotRunning(),
  )
  public unregisterProvider(pId: ProviderId): void {
    this.providers.delete(pId);
  }

  @createDestroyStartStop.ready(
    new identitiesErrors.ErrorIdentitiesManagerNotRunning(),
  )
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

  @createDestroyStartStop.ready(
    new identitiesErrors.ErrorIdentitiesManagerNotRunning(),
  )
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

  @createDestroyStartStop.ready(
    new identitiesErrors.ErrorIdentitiesManagerNotRunning(),
  )
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
    // This has to be done in case the key is `__proto__`.
    // Otherwise, the object will not be correctly serialized.
    // https://github.com/MatrixAI/Polykey/issues/608
    Object.defineProperty(providerTokens, identityId, {
      value: providerToken,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    const providerIdPath = [
      ...this.identitiesTokensDbPath,
      providerId,
    ] as unknown as KeyPath;
    await tran.put(providerIdPath, providerTokens);
  }

  @createDestroyStartStop.ready(
    new identitiesErrors.ErrorIdentitiesManagerNotRunning(),
  )
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
      throw new identitiesErrors.ErrorProviderIdentityMissing(
        `Authenticated identities: ${JSON.stringify(identities)}`,
      );
    }
    // Create identity claim on our node
    const { p: publishedClaimP, resolveP: publishedClaimResolveP } =
      promise<IdentitySignedClaim>();
    await this.db.withTransactionF((tran) =>
      this.sigchain.addClaim(
        {
          typ: 'ClaimLinkIdentity',
          iss: nodesUtils.encodeNodeId(this.keyRing.getNodeId()),
          sub: encodeProviderIdentityId([providerId, identityId]),
        },
        undefined,
        async (token: Token<ClaimLinkIdentity>) => {
          // Publishing in the callback to avoid adding bad claims
          const claim = token.toSigned();
          const identitySignedClaim = await provider.publishClaim(
            identityId,
            claim,
          );
          publishedClaimResolveP(identitySignedClaim);
          // Append the ProviderIdentityClaimId to the token
          const payload: ClaimLinkIdentity = {
            ...claim.payload,
            providerIdentityClaimId: identitySignedClaim.id,
          };
          const newToken = Token.fromPayload(payload);
          newToken.signWithPrivateKey(this.keyRing.keyPair);
          return newToken;
        },
        tran,
      ),
    );
    const publishedClaim = await publishedClaimP;
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
