
// Time to look at the Sigchain
// and see how to replace this stuff

import type { DB, DBTransaction, LevelPath, KeyPath } from '@matrixai/db';
import type { ChainDataEncoded } from './types';
import type {
  ClaimData,
  ClaimEncoded,
  ClaimId,
  ClaimIntermediary,
  ClaimType,
} from '../claims/types';
import type KeyRing from '../keys/KeyRing';
import type { NodeIdEncoded } from '../ids/types';
import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { withF } from '@matrixai/resources';
import * as sigchainErrors from './errors';
import * as sigchainUtils from './utils';
import * as claimsUtils from '../claims/utils';

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

  // if a sigchain gets refreshed
  // or deleted... that's ok, nobody else is replicating this information FOR now

  protected readonly sequenceNumberKey: string = 'prevSequenceNumber';

  protected logger: Logger;
  protected keyRing: KeyRing;
  protected db: DB;
  protected generateClaimId: () => ClaimId;
  protected generateSequenceNumber: () => number;
  protected dbPath: LevelPath = [this.constructor.name];
  // Claims collection
  // `Sigchain/claims/{ClaimId} -> {Claim}`
  protected dbClaimsPath: LevelPath = [this.constructor.name, 'claims'];
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


  // While general format provides multi-sig
  // We don't really have to store it in that format
  // general format can just be when we are presenting the info
  // but we can definitely store it as is too
  // JWE is generally encrypted for multiple recipients
  // JWE flattened is for 1 recipient
  // right now for the purposes for encryption we have no need to "encrypt" a thing
  // for multipel people, the message is just encrypted
  // but we can imagine that the sigchain CLAIM can in fact be signed by multiple entities
  // ClaimId (the lexicographic integer of the sequence number)
  // -> ClaimEncoded (a JWS in General JSON Serialization)
  // protected sigchainClaimsDbPath: LevelPath = [this.constructor.name, 'claims'];
  // Sub-level database for numerical metadata to be persisted
  // e.g. "sequenceNumber" -> current sequence number
  // protected sigchainMetadataDbPath: LevelPath = [
  //   this.constructor.name,
  //   'metadata',
  // ];

  // Does signing a claim take time?
  // Not not really atm.

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
    this.generateClaimId = sigchainUtils.createClaimIdGenerator(
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
    this.generateClaimId = sigchainUtils.createClaimIdGenerator(
      this.keyRing.getNodeId(),
      lastClaimId,
    );
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
    return await tran.get<Claim>([
      ... this.dbClaimsPath,
      claimId.toBuffer(),
    ]);
  }

  /**
   * Get claims
   * The default is ascending order.
   * Use `desc` to get the latest claims.
   * Note I have changed this to `asc`.
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async *getClaims(
    order: 'asc' | 'desc' = 'asc',
    tran?: DBTransaction
  ): AsyncGenerator<Claim> {
    if (tran == null) {
      return yield* this.db.withTransactionG((tran) => this.getClaims(order, tran));
    }
    for await (const [, claim] of tran.iterator<Claim>(this.dbClaimsPath, {
      keys: false,
      valueAsBuffer: false,
      reverse: order !== 'asc',
    })) {
      yield claim;
    }
  }

  // the filter can be applied by the user
  // we don't want to force it here
  /**
   * Retrieve every claim of a specific claim type from the sigchain.
   * TODO: Currently, all claims in the sigchain are regarded as additions -
   * we have no notion of revocations/deletions. Thus, this method simply
   * fetches ALL claims in the sigchain that are of the passed type.
   * NOTE: no verification of claim performed here. This should be done by the
   * requesting client.
   */
  // @ready(new sigchainErrors.ErrorSigchainNotRunning())
  // public async getClaims(
  //   claimType: ClaimType,
  //   tran?: DBTransaction,
  // ): Promise<Array<ClaimEncoded>> {
  //   if (tran == null) {
  //     return this.db.withTransactionF((tran) =>
  //       this.getClaims(claimType, tran),
  //     );
  //   }
  //   const relevantClaims: Array<ClaimEncoded> = [];
  //   const readIterator = tran.iterator<ClaimEncoded>(
  //     this.sigchainClaimsDbPath,
  //     { valueAsBuffer: false },
  //   );
  //   for await (const [, claim] of readIterator) {
  //     const decodedClaim = claimsUtils.decodeClaim(claim);
  //     if (decodedClaim.payload.data.type === claimType) {
  //       relevantClaims.push(claim);
  //     }
  //   }
  //   return relevantClaims;
  // }

  // you can also make something stateful
  // as a observable property
  // it does mean stateful aspects can also be a subscriptable
  // not just in-memory properties
  // in that case it may in fact be a data stream
  // it may also something else
  // in that case, we might turn a "pull stream"
  // into an observable
  // that way if you pass something in to the state
  // you can also subscribe to it
  // but not sure if we are usign it yet


  // @ready(new sigchainErrors.ErrorSigchainNotRunning())
  // public async getSeqMap(
  //   tran?: DBTransaction,
  // ): Promise<Record<number, ClaimId>> {
  //   if (tran == null) {
  //     return this.db.withTransactionF((tran) => this.getSeqMap(tran));
  //   }
  //   const map: Record<number, ClaimId> = {};
  //   const claimStream = tran.iterator(this.sigchainClaimsDbPath, {
  //     values: false,
  //   });
  //   let seq = 1;
  //   for await (const [keyPath] of claimStream) {
  //     const key = keyPath[0] as Buffer;
  //     map[seq] = IdInternal.fromBuffer<ClaimId>(key);
  //     seq++;
  //   }
  //   return map;
  // }

  /**
   * Appends a claim (of any type) to the sigchain.
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async addClaim(
    claimData: ClaimData,
    tran?: DBTransaction,
  ): Promise<[ClaimId, ClaimEncoded]> {
    const claimId = this.generateClaimId();
    const claimIdPath = [...this.sigchainClaimsDbPath, claimId.toBuffer()];
    const sequenceNumberPath = [
      ...this.sigchainMetadataDbPath,
      this.sequenceNumberKey,
    ];
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.addClaim(claimData, tran));
    }

    await tran.lock(sequenceNumberPath.join(''));
    const prevSequenceNumber = await tran.getForUpdate<number>([
      ...this.sigchainMetadataDbPath,
      this.sequenceNumberKey,
    ]);
    if (prevSequenceNumber === undefined) {
      throw new sigchainErrors.ErrorSigchainSequenceNumUndefined();
    }
    const newSequenceNumber = prevSequenceNumber + 1;
    const claim = await this.createClaim({
      hPrev: await this.getHashPrevious(tran),
      seq: newSequenceNumber,
      data: claimData,
    });
    // Add the claim to the sigchain database, and update the sequence number
    await tran.put(claimIdPath, claim);
    await tran.put(sequenceNumberPath, newSequenceNumber);
    return [claimId, claim];
  }

  /**
   * Appends an already created claim onto the sigchain.
   * Checks that the sequence number and hash of previous claim are valid.
   * Assumes that the signature/s have already been verified.
   * Note: the usage of this function expects that the sigchain's mutex is
   * acquired in order to execute. Otherwise, a race condition may occur, and
   * an exception could be thrown.
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async addExistingClaim(
    claim: ClaimEncoded,
    tran?: DBTransaction,
  ): Promise<void> {
    const claimId = this.generateClaimId();
    const claimIdPath = [...this.sigchainClaimsDbPath, claimId.toBuffer()];
    const sequenceNumberPath = [
      ...this.sigchainMetadataDbPath,
      this.sequenceNumberKey,
    ];
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.addExistingClaim(claim, tran),
      );
    }

    await tran.lock(sequenceNumberPath.join(''));
    const decodedClaim = claimsUtils.decodeClaim(claim);
    const prevSequenceNumber = await tran.getForUpdate<number>([
      ...this.sigchainMetadataDbPath,
      this.sequenceNumberKey,
    ]);
    if (prevSequenceNumber === undefined) {
      throw new sigchainErrors.ErrorSigchainSequenceNumUndefined();
    }
    const expectedSequenceNumber = prevSequenceNumber + 1;
    // Ensure the sequence number and hash are correct before appending
    if (decodedClaim.payload.seq !== expectedSequenceNumber) {
      throw new sigchainErrors.ErrorSigchainInvalidSequenceNum();
    }
    if (decodedClaim.payload.hPrev !== (await this.getHashPrevious(tran))) {
      throw new sigchainErrors.ErrorSigchainInvalidHash();
    }
    await tran.put(claimIdPath, claim);
    await tran.put(sequenceNumberPath, expectedSequenceNumber);
  }

  /**
   * Creates an intermediary claim (a claim that expects an additional signature
   * from another keynode before being appended to the sigchain).
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async createIntermediaryClaim(
    claimData: ClaimData,
    tran?: DBTransaction,
  ): Promise<ClaimIntermediary> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.createIntermediaryClaim(claimData, tran),
      );
    }
    const claim = await this.createClaim({
      hPrev: await this.getHashPrevious(tran),
      seq: (await this.getSequenceNumber(tran)) + 1,
      data: claimData,
    });
    return {
      payload: claim.payload,
      signature: claim.signatures[0],
    };
  }

  /**
   * Retrieve every claim from the entire sigchain.
   * i.e. from 1 to prevSequenceNumber
   * @returns record of ClaimId -> base64url encoded claims. Use
   * claimUtils.decodeClaim() to decode each claim.
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async getChainData(tran?: DBTransaction): Promise<ChainDataEncoded> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.getChainData(tran));
    }
    const chainData: ChainDataEncoded = {};
    const readIterator = tran.iterator<ClaimEncoded>(
      this.sigchainClaimsDbPath,
      { valueAsBuffer: false },
    );
    for await (const [keyPath, claimEncoded] of readIterator) {
      const key = keyPath[0] as Buffer;
      const claimId = IdInternal.fromBuffer<ClaimId>(key);
      chainData[claimsUtils.encodeClaimId(claimId)] = claimEncoded;
    }
    return chainData;
  }


  /**
   * Helper function to create claims internally in the Sigchain class.
   * Wraps claims::createClaim() with the static information common to all
   * claims in this sigchain (i.e. the private key).
   */
  protected async createClaim({
    hPrev,
    seq,
    data,
    alg,
  }: {
    hPrev: string | null;
    seq: number;
    data: ClaimData;
    alg?: string;
  }): Promise<ClaimEncoded> {
    // Get kid from the claim data
    let kid: NodeIdEncoded;
    if (data.type === 'node') {
      kid = data.node1;
    } else {
      kid = data.node;
    }
    return await claimsUtils.createClaim({
      privateKey: this.keyRing.keyPair.privateKey,
      hPrev: hPrev,
      seq: seq,
      data: data,
      kid: kid,
      alg: alg,
    });
  }

  /**
   * Retrieves the sequence number from the metadata database of the most recent
   * claim in the sigchain (i.e. the previous sequence number).
   * @returns previous sequence number
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  protected async getSequenceNumber(tran: DBTransaction): Promise<number> {
    const sequenceNumber = await tran.get<number>([
      ...this.sigchainMetadataDbPath,
      this.sequenceNumberKey,
    ]);
    // Should never be reached: getSigchainDb() has a check whether sigchain
    // has been started (where the sequence number is initialised)
    if (sequenceNumber === undefined) {
      throw new sigchainErrors.ErrorSigchainSequenceNumUndefined();
    }
    return sequenceNumber;
  }

  /**
   * Helper function to compute the hash of the previous claim.
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  protected async getHashPrevious(tran: DBTransaction): Promise<string | null> {
    const prevSequenceNumber = await this.getLatestClaimId(tran);
    if (prevSequenceNumber == null) {
      // If no other claims, then null
      return null;
    } else {
      // Otherwise, create a hash of the previous claim
      const previousClaim = await this.getClaim(prevSequenceNumber, tran);
      return claimsUtils.hashClaim(previousClaim);
    }
  }
}

export default Sigchain;
