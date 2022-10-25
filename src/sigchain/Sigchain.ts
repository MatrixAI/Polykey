import type { DB, DBTransaction, LevelPath, KeyPath } from '@matrixai/db';
import type {
  ClaimInput,
  ClaimHeaderSignatureJSON
} from './types';
import type KeyRing from '../keys/KeyRing';
import type { TokenSignature } from '../tokens/types';
import type {
  ClaimId,
  Claim,
  ClaimHeaderSignature,
  SignedClaim,
} from '../claims/types';
import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import Token from '../tokens/Token';
import * as sigchainErrors from './errors';
import * as claimsUtils from '../claims/utils';
import * as utils from '../utils';

interface Sigchain extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new sigchainErrors.ErrorSigchainRunning(),
  new sigchainErrors.ErrorSigchainDestroyed(),
)
class Sigchain {
  public static async createSigchain({
    db,
    keyRing,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    keyRing: KeyRing;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<Sigchain> {
    logger.info(`Creating ${this.name}`);
    const sigchain = new this({ db, keyRing, logger });
    await sigchain.start({ fresh });
    logger.info(`Created ${this.name}`);
    return sigchain;
  }

  protected logger: Logger;
  protected keyRing: KeyRing;
  protected db: DB;
  protected generateClaimId: () => ClaimId;
  protected generateSequenceNumber: () => number;
  protected dbPath: LevelPath = [this.constructor.name];

  // Claims collection
  // `Sigchain/claims/{ClaimId} -> {Claim}`
  protected dbClaimsPath: LevelPath = [...this.dbPath, 'claims'];

  // Signatures collection
  // `Sigchain/signatures/{ClaimId}/{lexi(number)} -> {ClaimHeaderSignature}`
  protected dbSignaturesPath: LevelPath = [...this.dbPath, 'signatures'];

  /**
   * Maintain last `ClaimId` to preserve monotonicity across process restarts.
   * The `ClaimId` provides a globally unique ID that is time-sortable.
   * `Sigchain/lastClaimId -> {raw(ClaimId)}`
   */
  protected dbLastClaimIdPath: KeyPath = [...this.dbPath, 'lastClaimId'];
  /**
   * Maintain last sequence number to preserve monotonicity across process restarts.
   * The sequence number provides cardinal and ordinal information regarding a claim.
   * `Sigchain/lastSequenceNumber -> {SequenceNumber}}`
   */
  protected dbLastSequenceNumberPath: KeyPath = [...this.dbPath, 'lastSequenceNumber'];

  constructor({
    db,
    keyRing,
    logger,
  }: {
    db: DB;
    keyRing: KeyRing;
    logger: Logger;
  }) {
    this.logger = logger;
    this.db = db;
    this.keyRing = keyRing;
  }

  public async start({
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      await this.db.clear(this.dbPath);
    }
    const lastClaimId = await this.getLastClaimId();
    this.generateClaimId = claimsUtils.createClaimIdGenerator(
      this.keyRing.getNodeId(),
      lastClaimId,
    );
    let lastSequenceNumber = (await this.getLastSequenceNumber()) ?? 0;
    this.generateSequenceNumber = () => {
      lastSequenceNumber += 1;
      return lastSequenceNumber;
    };
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.db.clear(this.dbPath);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Gets the last claim ID for preserving monotonicity over restarts
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning(), false, ['starting'])
  public async getLastClaimId(
    tran?: DBTransaction,
  ): Promise<ClaimId | undefined> {
    const lastClaimIdBuffer = await (tran ?? this.db).get(
      this.dbLastClaimIdPath,
      true,
    );
    if (lastClaimIdBuffer == null) return;
    return IdInternal.fromBuffer<ClaimId>(lastClaimIdBuffer);
  }

  /**
   * Gets the last sequence number for preserving monotonicity over restarts
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning(), false, ['starting'])
  public async getLastSequenceNumber(
    tran?: DBTransaction,
  ): Promise<number | undefined> {
    const lastSequenceNumber = await (tran ?? this.db).get<number>(
      this.dbLastSequenceNumberPath
    );
    return lastSequenceNumber;
  }

  /**
   * Call this method when the `KeyRing` changes
   * This should be replaced with rxjs later
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async onKeyRingChange() {
    const lastClaimId = await this.getLastClaimId();
    this.generateClaimId = claimsUtils.createClaimIdGenerator(
      this.keyRing.getNodeId(),
      lastClaimId,
    );
  }

  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async getLastClaim(tran?: DBTransaction): Promise<[ClaimId, Claim] | undefined> {
    for await (const claimEntry of this.getClaims({ order: 'desc', limit: 1}, tran)) {
      return claimEntry;
    }
    return;
  }

  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async getLastSignedClaim(tran?: DBTransaction): Promise<[ClaimId, SignedClaim] | undefined> {
    for await (const signedClaimEntry of this.getSignedClaims({
      order: 'desc',
      limit: 1
    }, tran)) {
      return signedClaimEntry;
    }
    return;
  }

  /**
   * Get a claim according to the `ClaimId`
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async getClaim(
    claimId: ClaimId,
    tran?: DBTransaction,
  ): Promise<Claim | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.getClaim(claimId, tran));
    }
    return tran.get<Claim>([
      ... this.dbClaimsPath,
      claimId.toBuffer(),
    ]);
  }

  /**
   * Get a signed claim according to the `ClaimId`
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async getSignedClaim(
    claimId: ClaimId,
    tran?: DBTransaction,
  ): Promise<SignedClaim | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.getSignedClaim(claimId, tran));
    }
    const claim = await tran.get<Claim>([
      ... this.dbClaimsPath,
      claimId.toBuffer(),
    ]);
    if (claim == null) {
      return;
    }
    const claimSignatures = await this.getSignatures(claimId, tran);
    return {
      payload: claim,
      signatures: claimSignatures
    };
  }

  /**
   * Get a claim signatures according to the `ClaimId`
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async getSignatures(
    claimId: ClaimId,
    tran?: DBTransaction,
  ): Promise<Array<ClaimHeaderSignature>> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.getSignatures(claimId, tran));
    }
    const headerSignatures: Array<ClaimHeaderSignature> = [];
    for await (const [, headerSignatureJSON] of tran.iterator<ClaimHeaderSignatureJSON>(
      [...this.dbSignaturesPath, claimId.toBuffer()],
      {
        keys: false,
        valueAsBuffer: false
      }
    )) {
      headerSignatures.push({
        protected: headerSignatureJSON.protected,
        signature: Buffer.from(headerSignatureJSON.signature.data) as TokenSignature
      });
    }
    return headerSignatures;
  }

  /**
   * Get claims
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async *getClaims(
    {
      order = 'asc',
      seek,
      limit
    }: {
      order?: 'asc' | 'desc';
      seek?: ClaimId;
      limit?: number;
    } = {},
    tran?: DBTransaction
  ): AsyncGenerator<[ClaimId, Claim]> {
    if (tran == null) {
      return yield* this.db.withTransactionG((tran) => this.getClaims({ order, seek }, tran));
    }
    const orderOptions = (order === 'asc') ? { reverse: false } : { reverse: true };
    let seekOptions: { gte: [ClaimId] } | { lte: [ClaimId] } | {} = {};
    if (seek != null) {
      seekOptions = (order === 'asc') ? {
        gte: [seek.toBuffer()],
      } : {
        lte: [seek.toBuffer()],
      };
    }
    for await (const [kP, claim] of tran.iterator<Claim>(this.dbClaimsPath, {
      valueAsBuffer: false,
      ...orderOptions,
      ...seekOptions,
      limit,
    })) {
      const claimId = IdInternal.fromBuffer<ClaimId>(kP[0] as Buffer);
      yield [claimId, claim];
    }
  }

  /**
   * Get signed claims
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async *getSignedClaims(
    {
      order = 'asc',
      seek,
      limit
    }: {
      order?: 'asc' | 'desc';
      seek?: ClaimId;
      limit?: number;
    } = {},
    tran?: DBTransaction
  ): AsyncGenerator<[ClaimId, SignedClaim]> {
    if (tran == null) {
      return yield* this.db.withTransactionG((tran) => this.getSignedClaims({ order, seek }, tran));
    }
    const orderOptions = (order === 'asc') ? { reverse: false } : { reverse: true };
    let seekOptions: { gte: [ClaimId] } | { lte: [ClaimId] } | {} = {};
    if (seek != null) {
      seekOptions = (order === 'asc') ? {
        gte: [seek.toBuffer()],
      } : {
        lte: [seek.toBuffer()],
      };
    }
    for await (const [kP, claim] of tran.iterator<Claim>(this.dbClaimsPath, {
      valueAsBuffer: false,
      ...orderOptions,
      ...seekOptions,
      limit,
    })) {
      const claimId = IdInternal.fromBuffer<ClaimId>(kP[0] as Buffer);
      const claimSignatures = await this.getSignatures(claimId, tran);
      yield [
        claimId,
        {
          payload: claim,
          signatures: claimSignatures
        }
      ];
    }
  }

  /**
   * Appends a claim (of any type) to the sigchain.
   * For `ClaimInput`, it will be JSON encoded.
   * Remember that `undefined` properties are deleted.
   * While `undefined` values in arrays are converted to `null`.
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async addClaim(
    data: ClaimInput,
    date: Date = new Date(),
    signingHook?: (token: Token<Claim>) => Promise<void>,
    tran?: DBTransaction,
  ): Promise<[ClaimId, SignedClaim]> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.addClaim(
        data,
        date,
        signingHook,
        tran
      ));
    }
    // Appending is a serialised operation
    await this.lockLastClaimId(tran);
    const prevSignedClaim = await this.getLastSignedClaim(tran);
    const time = utils.getUnixtime(date);
    const claimId = this.generateClaimId();
    const claimIdBuffer = claimId.toBuffer();
    const seq = this.generateSequenceNumber();
    // Undo the sequence number if the transaction fails
    tran.queueFailure(() => {
      let lastSequenceNumber = seq - 1;
      this.generateSequenceNumber = () => {
        lastSequenceNumber += 1;
        return lastSequenceNumber;
      };
    });
    let claim: Claim;
    if (prevSignedClaim != null) {
      const prevClaimId = prevSignedClaim[0];
      const prevDigest = claimsUtils.hashSignedClaim(
        prevSignedClaim[1],
        'blake2b-256'
      );
      const prevDigestEncoded = claimsUtils.encodeSignedClaimDigest(
        prevDigest,
        'blake2b-256'
      );
      claim = {
        ...data,
        jti: claimsUtils.encodeClaimId(claimId),
        iat: time,
        nbf: time,
        seq,
        prevClaimId: claimsUtils.encodeClaimId(prevClaimId),
        prevDigest: prevDigestEncoded,
      };
    } else {
      claim = {
        ...data,
        jti: claimsUtils.encodeClaimId(claimId),
        iat: time,
        nbf: time,
        seq,
        prevClaimId: null,
        prevDigest: null,
      };
    }
    const claimToken = Token.fromPayload<Claim>(claim);
    // Sign all claims with this node's keypair
    claimToken.signWithPrivateKey(
      this.keyRing.keyPair
    );
    if (signingHook != null) {
      await signingHook(claimToken);
    }
    const signedClaim = claimToken.toSigned();
    await tran.put([...this.dbClaimsPath, claimIdBuffer], signedClaim.payload);
    for (const [index, headerSignature] of signedClaim.signatures.entries()) {
      await tran.put(
        [
          ...this.dbSignaturesPath,
          claimIdBuffer,
          utils.lexiPackBuffer(index)
        ],
        headerSignature
      );
    }
    await tran.put(this.dbLastClaimIdPath, claimIdBuffer, true);
    await tran.put(this.dbLastSequenceNumberPath, seq);
    // Due to JSON encoding performed by the DB, the returned data
    // can look different, so we fetch it from the DB again to return
    const signedClaim_ = (await this.getSignedClaim(claimId, tran))!;
    return [claimId, signedClaim_];
  }

  /**
   * Mutually exclude the last claim ID.
   * Use this to ensure claim appending is serialised.
   */
  protected async lockLastClaimId(tran: DBTransaction): Promise<void> {
    return tran.lock(this.dbLastClaimIdPath.join(''));
  }
}

export default Sigchain;
