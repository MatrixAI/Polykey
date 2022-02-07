import type { DB, DBLevel, DBOp } from '@matrixai/db';
import type { ChainDataEncoded } from './types';
import type {
  ClaimData,
  ClaimEncoded,
  ClaimId,
  ClaimIdGenerator,
  ClaimIntermediary,
  ClaimType,
} from '../claims/types';
import type { KeyManager } from '../keys';
import type { NodeIdEncoded } from '../nodes/types';
import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import { Mutex } from 'async-mutex';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import * as sigchainErrors from './errors';
import * as claimsUtils from '../claims/utils';
import { utils as nodesUtils } from '../nodes';

interface Sigchain extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new sigchainErrors.ErrorSigchainRunning(),
  new sigchainErrors.ErrorSigchainDestroyed(),
)
class Sigchain {
  public readonly sigchainPath: string;
  public readonly sigchainDbPath: string;
  protected readonly sequenceNumberKey: string = 'prevSequenceNumber';

  protected logger: Logger;
  protected keyManager: KeyManager;
  protected db: DB;
  protected sigchainDbDomain: string = this.constructor.name;
  protected sigchainClaimsDbDomain: Array<string> = [
    this.sigchainDbDomain,
    'claims',
  ];
  protected sigchainMetadataDbDomain: Array<string> = [
    this.sigchainDbDomain,
    'metadata',
  ];
  protected sigchainDb: DBLevel;
  // ClaimId (the lexicographic integer of the sequence number)
  // -> ClaimEncoded (a JWS in General JSON Serialization)
  protected sigchainClaimsDb: DBLevel;
  // Sub-level database for numerical metadata to be persisted
  // e.g. "sequenceNumber" -> current sequence number
  protected sigchainMetadataDb: DBLevel;
  protected lock: Mutex = new Mutex();

  protected generateClaimId: ClaimIdGenerator;

  static async createSigchain({
    db,
    keyManager,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    keyManager: KeyManager;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<Sigchain> {
    logger.info(`Creating ${this.name}`);
    const sigchain = new Sigchain({ db, keyManager, logger });
    await sigchain.start({ fresh });
    logger.info(`Created ${this.name}`);
    return sigchain;
  }

  constructor({
    db,
    keyManager,
    logger,
  }: {
    db: DB;
    keyManager: KeyManager;
    logger: Logger;
  }) {
    this.logger = logger;
    this.db = db;
    this.keyManager = keyManager;
  }

  get locked(): boolean {
    return this.lock.isLocked();
  }

  public async start({
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    // Top-level database for the sigchain domain
    const sigchainDb = await this.db.level(this.sigchainDbDomain);
    // ClaimId (the lexicographic integer of the sequence number)
    // -> ClaimEncoded (a JWS in General JSON Serialization)
    const sigchainClaimsDb = await this.db.level(
      this.sigchainClaimsDbDomain[1],
      sigchainDb,
    );
    // Sub-level database for numerical metadata to be persisted
    // e.g. "sequenceNumber" -> current sequence number
    const sigchainMetadataDb = await this.db.level(
      this.sigchainMetadataDbDomain[1],
      sigchainDb,
    );
    if (fresh) {
      await sigchainDb.clear();
    }
    this.sigchainDb = sigchainDb;
    this.sigchainClaimsDb = sigchainClaimsDb;
    this.sigchainMetadataDb = sigchainMetadataDb;

    // Initialise the sequence number (if not already done).
    // First claim in the sigchain has a sequence number of 1.
    // Therefore, with no claims in the sigchain, the previous sequence number
    // is set to 0.
    await this._transaction(async () => {
      const sequenceNumber = await this.db.get<number | null>(
        this.sigchainMetadataDbDomain,
        this.sequenceNumberKey,
      );
      if (sequenceNumber == null) {
        await this.db.put(
          this.sigchainMetadataDbDomain,
          this.sequenceNumberKey,
          0,
        );
      }
    });

    // Creating the ID generator
    const latestId = await this.getLatestClaimId();
    this.generateClaimId = claimsUtils.createClaimIdGenerator(
      nodesUtils.encodeNodeId(this.keyManager.getNodeId()),
      latestId,
    );
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    const sigchainDb = await this.db.level(this.sigchainDbDomain);
    await sigchainDb.clear();
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Run several operations within the same lock
   * This does not ensure atomicity of the underlying database
   * Database atomicity still depends on the underlying operation
   */
  public async transaction<T>(f: (that: this) => Promise<T>): Promise<T> {
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
  protected async _transaction<T>(f: () => Promise<T>): Promise<T> {
    if (this.lock.isLocked()) {
      return await f();
    } else {
      return await this.transaction(f);
    }
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
      privateKey: this.keyManager.getRootKeyPairPem().privateKey,
      hPrev: hPrev,
      seq: seq,
      data: data,
      kid: kid,
      alg: alg,
    });
  }

  /**
   * Appends a claim (of any type) to the sigchain.
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async addClaim(
    claimData: ClaimData,
  ): Promise<[ClaimId, ClaimEncoded]> {
    return await this._transaction(async () => {
      const prevSequenceNumber = await this.getSequenceNumber();
      const newSequenceNumber = prevSequenceNumber + 1;

      const claim = await this.createClaim({
        hPrev: await this.getHashPrevious(),
        seq: newSequenceNumber,
        data: claimData,
      });

      // Add the claim to the sigchain database, and update the sequence number
      const claimId = this.generateClaimId();
      const ops: Array<DBOp> = [
        {
          type: 'put',
          domain: this.sigchainClaimsDbDomain,
          key: claimId.toBuffer(),
          value: claim,
        },
        {
          type: 'put',
          domain: this.sigchainMetadataDbDomain,
          key: this.sequenceNumberKey,
          value: newSequenceNumber,
        },
      ];
      await this.db.batch(ops);
      return [claimId, claim];
    });
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
  public async addExistingClaim(claim: ClaimEncoded): Promise<void> {
    await this._transaction(async () => {
      const decodedClaim = claimsUtils.decodeClaim(claim);
      const prevSequenceNumber = await this.getSequenceNumber();
      const expectedSequenceNumber = prevSequenceNumber + 1;
      // Ensure the sequence number and hash are correct before appending
      if (decodedClaim.payload.seq !== expectedSequenceNumber) {
        throw new sigchainErrors.ErrorSigchainInvalidSequenceNum();
      }
      if (decodedClaim.payload.hPrev !== (await this.getHashPrevious())) {
        throw new sigchainErrors.ErrorSigchainInvalidHash();
      }
      const ops: Array<DBOp> = [
        {
          type: 'put',
          domain: this.sigchainClaimsDbDomain,
          key: this.generateClaimId().toBuffer(),
          value: claim,
        },
        {
          type: 'put',
          domain: this.sigchainMetadataDbDomain,
          key: this.sequenceNumberKey,
          value: expectedSequenceNumber,
        },
      ];
      await this.db.batch(ops);
    });
  }

  /**
   * Creates an intermediary claim (a claim that expects an additional signature
   * from another keynode before being appended to the sigchain).
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async createIntermediaryClaim(
    claimData: ClaimData,
  ): Promise<ClaimIntermediary> {
    return await this._transaction(async () => {
      const claim = await this.createClaim({
        hPrev: await this.getHashPrevious(),
        seq: (await this.getSequenceNumber()) + 1,
        data: claimData,
      });
      const intermediaryClaim: ClaimIntermediary = {
        payload: claim.payload,
        signature: claim.signatures[0],
      };
      return intermediaryClaim;
    });
  }

  /**
   * Retrieve every claim from the entire sigchain.
   * i.e. from 1 to prevSequenceNumber
   * @returns record of ClaimId -> base64url encoded claims. Use
   * claimUtils.decodeClaim() to decode each claim.
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async getChainData(): Promise<ChainDataEncoded> {
    return await this._transaction(async () => {
      const chainData: ChainDataEncoded = {};
      for await (const o of this.sigchainClaimsDb.createReadStream()) {
        const claimId = IdInternal.fromBuffer<ClaimId>((o as any).key);
        const encryptedClaim = (o as any).value;
        const claim = await this.db.deserializeDecrypt<ClaimEncoded>(
          encryptedClaim,
          false,
        );
        chainData[claimsUtils.encodeClaimId(claimId)] = claim;
      }
      return chainData;
    });
  }

  /**
   * Retrieve every claim of a specific claim type from the sigchain.
   * TODO: Currently, all claims in the sigchain are regarded as additions -
   * we have no notion of revocations/deletions. Thus, this method simply
   * fetches ALL claims in the sigchain that are of the passed type.
   * NOTE: no verification of claim performed here. This should be done by the
   * requesting client.
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async getClaims(claimType: ClaimType): Promise<Array<ClaimEncoded>> {
    return await this._transaction(async () => {
      const relevantClaims: Array<ClaimEncoded> = [];
      for await (const o of this.sigchainClaimsDb.createReadStream()) {
        const data = (o as any).value;
        const claim = await this.db.deserializeDecrypt<ClaimEncoded>(
          data,
          false,
        );
        const decodedClaim = claimsUtils.decodeClaim(claim);
        if (decodedClaim.payload.data.type === claimType) {
          relevantClaims.push(claim);
        }
      }
      return relevantClaims;
    });
  }

  /**
   * Retrieves the sequence number from the metadata database of the most recent
   * claim in the sigchain (i.e. the previous sequence number).
   * @returns previous sequence number
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async getSequenceNumber(): Promise<number> {
    return await this._transaction(async () => {
      const sequenceNumber = await this.db.get<number>(
        this.sigchainMetadataDbDomain,
        this.sequenceNumberKey,
      );
      // Should never be reached: getSigchainDb() has a check whether sigchain
      // has been started (where the sequence number is initialised)
      if (sequenceNumber === undefined) {
        throw new sigchainErrors.ErrorSigchainSequenceNumUndefined();
      }
      return sequenceNumber;
    });
  }

  /**
   * Helper function to compute the hash of the previous claim.
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async getHashPrevious(): Promise<string | null> {
    return await this._transaction(async () => {
      const prevSequenceNumber = await this.getLatestClaimId();
      if (prevSequenceNumber == null) {
        // If no other claims, then null
        return null;
      } else {
        // Otherwise, create a hash of the previous claim
        const previousClaim = await this.getClaim(prevSequenceNumber);
        return claimsUtils.hashClaim(previousClaim);
      }
    });
  }

  /**
   * Retrieves a claim from the sigchain. If not found, throws exception.
   * Use if you always expect a claim for this particular sequence number
   * (otherwise, if you want to check for existence, just use getSigchainDb()
   * and check if returned value is undefined).
   * @param claimId the ClaimId of the claim to retrieve
   * @returns the claim (a JWS)
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async getClaim(claimId: ClaimId): Promise<ClaimEncoded> {
    return await this._transaction(async () => {
      const claim = await this.db.get<ClaimEncoded>(
        this.sigchainClaimsDbDomain,
        claimId.toBuffer(),
      );
      if (claim == null) {
        throw new sigchainErrors.ErrorSigchainClaimUndefined();
      }
      return claim;
    });
  }

  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async getSeqMap(): Promise<Record<number, ClaimId>> {
    const map: Record<number, ClaimId> = {};
    const claimStream = this.sigchainClaimsDb.createKeyStream();
    let seq = 1;
    for await (const o of claimStream) {
      map[seq] = IdInternal.fromBuffer<ClaimId>(o);
      seq++;
    }
    return map;
  }

  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async clearDB() {
    this.sigchainDb.clear();

    await this._transaction(async () => {
      await this.db.put(
        this.sigchainMetadataDbDomain,
        this.sequenceNumberKey,
        0,
      );
    });
  }

  protected async getLatestClaimId(): Promise<ClaimId | undefined> {
    return await this._transaction(async () => {
      let latestId: ClaimId | undefined;
      const keyStream = this.sigchainClaimsDb.createKeyStream({
        limit: 1,
        reverse: true,
      });
      for await (const o of keyStream) {
        latestId = IdInternal.fromBuffer<ClaimId>(o);
      }
      return latestId;
    });
  }
}

export default Sigchain;
