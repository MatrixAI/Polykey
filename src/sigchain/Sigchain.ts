import type { DB, DBTransaction, LevelPath, KeyPath } from '@matrixai/db';

import type { ClaimId } from '../ids/types';
import type { TokenClaim } from '../tokens/types';
import type { POJO } from '../types';


// import type { ChainDataEncoded } from './types';
// import type {
//   ClaimData,
//   ClaimEncoded,
//   ClaimId,
//   ClaimIntermediary,
//   ClaimType,
// } from '../claims/types';


import type KeyRing from '../keys/KeyRing';
// import type { NodeIdEncoded } from '../ids/types';
import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
// import { withF } from '@matrixai/resources';
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

  // protected readonly sequenceNumberKey: string = 'prevSequenceNumber';

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
  ): Promise<TokenClaim | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.getClaim(claimId, tran));
    }
    return await tran.get<TokenClaim>([
      ... this.dbClaimsPath,
      claimId.toBuffer(),
    ]);
  }

  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async getLastClaim(tran?: DBTransaction): Promise<[ClaimId, TokenClaim] | undefined> {
    for await (const claimEntry of this.getClaims({ order: 'desc', limit: 1}, tran)) {
      return claimEntry;
    }
    return;
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
  ): AsyncGenerator<[ClaimId, TokenClaim]> {
    if (tran == null) {
      return yield* this.db.withTransactionG((tran) => this.getClaims({ order, seek }, tran));
    }
    const orderOptions = (order !== 'asc') ? { reverse: false } : { reverse: true};
    let seekOptions: { gte: [ClaimId] } | { lte: [ClaimId] } | {} = {};
    if (seek != null) {
      seekOptions = (order === 'asc') ? {
        gte: [seek.toBuffer()],
      } : {
        lte: [seek.toBuffer()],
      };
    }
    for await (const [kP, claim] of tran.iterator<TokenClaim>(this.dbClaimsPath, {
      valueAsBuffer: false,
      ...orderOptions,
      ...seekOptions,
      limit,
    })) {
      const claimId = IdInternal.fromBuffer<ClaimId>(kP[0] as Buffer);
      yield [claimId, claim];
    }
  }


  // This is what the claim data is
  // we are going to make this a bit easier to do
  // but to do this
  // we have to say what kind of claims we can have
  // type ClaimData = ClaimLinkNode | ClaimLinkIdentity;

  // shouldn't be using special time to ensure we get some sort of monotinicity
  // like `performance.timeOrigin + performance.now()`
  // yea, but we want to allow the ability to set the date
  // the default of which is just the normal date time thing
  // users can still set `performance.timeOrigin + performance.now()`
  // and produce a date based on that

  /**
   * Appends a claim (of any type) to the sigchain.
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async addClaim(
    data: POJO,
    date: Date = new Date(),
    tran?: DBTransaction,
  ): Promise<[ClaimId, TokenClaim]> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.addClaim(data, tran));
    }
    // Appending is a serialised operation
    await this.lockLastClaimId(tran);
    const claimPrevious = await this.getLastClaim(tran);
    if (claimPrevious != null) {
      claimsUtils.hashClaim(claimPrevious[1]);
    }

    // the hPrev
    // should be a multihash right?

    const claimId = this.generateClaimId();
    const seq = this.generateSequenceNumber();

    // const hPrev = await this.hashPrevious(tran);

    // we should be using the multihash algo in this case
    // not the sodium hash


    // hash the PREVIOUS claim

    const claim = await this.createClaim({
      hPrev,
      seq,
      data: claimData,
    });
    await tran.put([...this.dbClaimsPath, claimId.toBuffer()], claim);
    await tran.put(this.dbLastClaimIdPath, seq);
    await tran.put(this.dbLastSequenceNumberPath, claimId.toBuffer(), true);
    return [claimId, claim];
  }


  // this is meant to be part of the transaction
  // to do this, you have to get the latest claim

  // protected async hashPrevious(tran: DBTransaction): Promise<string | undefined> {
  //   const claimId = await this.getLastClaimId(tran);
  //   if (claimId == null) return;
  //   const previousClaim = (await this.getClaim(claimId, tran))!;
  //   return claimsUtils.hashClaim(previousClaim);
  // }

  // so there's no way to counter race for the last claim id
  // it is technically monotonic, and it is forced to be
  // since nobody else can do this
  // so this is technically not necessary
  // instead we want to "LOCK" on what is considered the last
  // claim, there can only be the 1 last claim
  // and i don't want it
  // so it just ensures serialisation

  /**
   * Mutually exclude the last claim ID.
   * Use this to ensure claim appending is serialised.
   */
  protected async lockLastClaimId(tran: DBTransaction): Promise<void> {
    return tran.lock(this.dbLastClaimIdPath.join(''));
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


  // /**
  //  * Appends an already created claim onto the sigchain.
  //  * Checks that the sequence number and hash of previous claim are valid.
  //  * Assumes that the signature/s have already been verified.
  //  * Note: the usage of this function expects that the sigchain's mutex is
  //  * acquired in order to execute. Otherwise, a race condition may occur, and
  //  * an exception could be thrown.
  //  */
  // @ready(new sigchainErrors.ErrorSigchainNotRunning())
  // public async addExistingClaim(
  //   claim: ClaimEncoded,
  //   tran?: DBTransaction,
  // ): Promise<void> {
  //   const claimId = this.generateClaimId();
  //   const claimIdPath = [...this.sigchainClaimsDbPath, claimId.toBuffer()];
  //   const sequenceNumberPath = [
  //     ...this.sigchainMetadataDbPath,
  //     this.sequenceNumberKey,
  //   ];
  //   if (tran == null) {
  //     return this.db.withTransactionF((tran) =>
  //       this.addExistingClaim(claim, tran),
  //     );
  //   }

  //   await tran.lock(sequenceNumberPath.join(''));
  //   const decodedClaim = claimsUtils.decodeClaim(claim);
  //   const prevSequenceNumber = await tran.getForUpdate<number>([
  //     ...this.sigchainMetadataDbPath,
  //     this.sequenceNumberKey,
  //   ]);
  //   if (prevSequenceNumber === undefined) {
  //     throw new sigchainErrors.ErrorSigchainSequenceNumUndefined();
  //   }
  //   const expectedSequenceNumber = prevSequenceNumber + 1;
  //   // Ensure the sequence number and hash are correct before appending
  //   if (decodedClaim.payload.seq !== expectedSequenceNumber) {
  //     throw new sigchainErrors.ErrorSigchainInvalidSequenceNum();
  //   }
  //   if (decodedClaim.payload.hPrev !== (await this.getHashPrevious(tran))) {
  //     throw new sigchainErrors.ErrorSigchainInvalidHash();
  //   }
  //   await tran.put(claimIdPath, claim);
  //   await tran.put(sequenceNumberPath, expectedSequenceNumber);
  // }

  // /**
  //  * Creates an intermediary claim (a claim that expects an additional signature
  //  * from another keynode before being appended to the sigchain).
  //  */
  // @ready(new sigchainErrors.ErrorSigchainNotRunning())
  // public async createIntermediaryClaim(
  //   claimData: ClaimData,
  //   tran?: DBTransaction,
  // ): Promise<ClaimIntermediary> {
  //   if (tran == null) {
  //     return this.db.withTransactionF((tran) =>
  //       this.createIntermediaryClaim(claimData, tran),
  //     );
  //   }
  //   const claim = await this.createClaim({
  //     hPrev: await this.getHashPrevious(tran),
  //     seq: (await this.getSequenceNumber(tran)) + 1,
  //     data: claimData,
  //   });
  //   return {
  //     payload: claim.payload,
  //     signature: claim.signatures[0],
  //   };
  // }

  // /**
  //  * Retrieve every claim from the entire sigchain.
  //  * i.e. from 1 to prevSequenceNumber
  //  * @returns record of ClaimId -> base64url encoded claims. Use
  //  * claimUtils.decodeClaim() to decode each claim.
  //  */
  // @ready(new sigchainErrors.ErrorSigchainNotRunning())
  // public async getChainData(tran?: DBTransaction): Promise<ChainDataEncoded> {
  //   if (tran == null) {
  //     return this.db.withTransactionF((tran) => this.getChainData(tran));
  //   }
  //   const chainData: ChainDataEncoded = {};
  //   const readIterator = tran.iterator<ClaimEncoded>(
  //     this.sigchainClaimsDbPath,
  //     { valueAsBuffer: false },
  //   );
  //   for await (const [keyPath, claimEncoded] of readIterator) {
  //     const key = keyPath[0] as Buffer;
  //     const claimId = IdInternal.fromBuffer<ClaimId>(key);
  //     chainData[claimsUtils.encodeClaimId(claimId)] = claimEncoded;
  //   }
  //   return chainData;
  // }


  // /**
  //  * Helper function to create claims internally in the Sigchain class.
  //  * Wraps claims::createClaim() with the static information common to all
  //  * claims in this sigchain (i.e. the private key).
  //  */
  // protected async createClaim({
  //   hPrev,
  //   seq,
  //   data,
  //   alg,
  // }: {
  //   hPrev: string | null;
  //   seq: number;
  //   data: ClaimData;
  //   alg?: string;
  // }): Promise<ClaimEncoded> {
  //   // Get kid from the claim data
  //   let kid: NodeIdEncoded;
  //   if (data.type === 'node') {
  //     kid = data.node1;
  //   } else {
  //     kid = data.node;
  //   }
  //   return await claimsUtils.createClaim({
  //     privateKey: this.keyRing.keyPair.privateKey,
  //     hPrev: hPrev,
  //     seq: seq,
  //     data: data,
  //     kid: kid,
  //     alg: alg,
  //   });
  // }

  // /**
  //  * Retrieves the sequence number from the metadata database of the most recent
  //  * claim in the sigchain (i.e. the previous sequence number).
  //  * @returns previous sequence number
  //  */
  // @ready(new sigchainErrors.ErrorSigchainNotRunning())
  // protected async getSequenceNumber(tran: DBTransaction): Promise<number> {
  //   const sequenceNumber = await tran.get<number>([
  //     ...this.sigchainMetadataDbPath,
  //     this.sequenceNumberKey,
  //   ]);
  //   // Should never be reached: getSigchainDb() has a check whether sigchain
  //   // has been started (where the sequence number is initialised)
  //   if (sequenceNumber === undefined) {
  //     throw new sigchainErrors.ErrorSigchainSequenceNumUndefined();
  //   }
  //   return sequenceNumber;
  // }

}

export default Sigchain;
