import type { DB, DBTransaction, KeyPath, LevelPath } from '@matrixai/db';
import type { ChainDataEncoded } from './types';
import type {
  ClaimData,
  ClaimEncoded,
  ClaimId,
  ClaimIdGenerator,
  ClaimIntermediary,
  ClaimType,
} from '../claims/types';
import type KeyManager from '../keys/KeyManager';
import type { NodeIdEncoded } from '../nodes/types';
import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { Lock, LockBox } from '@matrixai/async-locks';
import { withF } from '@matrixai/resources';
import * as sigchainErrors from './errors';
import * as claimsUtils from '../claims/utils';

interface Sigchain extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new sigchainErrors.ErrorSigchainRunning(),
  new sigchainErrors.ErrorSigchainDestroyed(),
)
class Sigchain {
  protected readonly sequenceNumberKey: string = 'prevSequenceNumber';

  protected logger: Logger;
  protected keyManager: KeyManager;
  protected db: DB;
  protected locks: LockBox<Lock> = new LockBox();
  // Top-level database for the sigchain domain
  protected sigchainDbPath: LevelPath = [this.constructor.name];
  // ClaimId (the lexicographic integer of the sequence number)
  // -> ClaimEncoded (a JWS in General JSON Serialization)
  protected sigchainClaimsDbPath: LevelPath = [this.constructor.name, 'claims'];
  // Sub-level database for numerical metadata to be persisted
  // e.g. "sequenceNumber" -> current sequence number
  protected sigchainMetadataDbPath: LevelPath = [
    this.constructor.name,
    'metadata',
  ];

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
    const sigchain = new this({ db, keyManager, logger });
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

  public async start({
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      await this.db.clear(this.sigchainDbPath);
    }
    // Initialise the sequence number (if not already done).
    // First claim in the sigchain has a sequence number of 1.
    // Therefore, with no claims in the sigchain, the previous sequence number
    // is set to 0.
    await withF([this.db.transaction()], async ([tran]) => {
      const sequenceNumber = await tran.get<number | null>([
        ...this.sigchainMetadataDbPath,
        this.sequenceNumberKey,
      ]);
      if (sequenceNumber == null) {
        await tran.put(
          [...this.sigchainMetadataDbPath, this.sequenceNumberKey],
          0,
        );
      }
      // Creating the ID generator
      const latestId = await this.getLatestClaimId(tran);
      this.generateClaimId = claimsUtils.createClaimIdGenerator(
        this.keyManager.getNodeId(),
        latestId,
      );
    });
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.db.clear(this.sigchainDbPath);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async withTransactionF<T>(
    ...params: [...keys: Array<KeyPath>, f: (tran: DBTransaction) => Promise<T>]
  ): Promise<T> {
    const f = params.pop() as (tran: DBTransaction) => Promise<T>;
    const lockRequests = (params as Array<KeyPath>).map<[KeyPath, typeof Lock]>(
      (key) => [key, Lock],
    );
    return withF(
      [this.db.transaction(), this.locks.lock(...lockRequests)],
      ([tran]) => f(tran),
    );
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
    tran?: DBTransaction,
  ): Promise<[ClaimId, ClaimEncoded]> {
    const claimId = this.generateClaimId();
    const claimIdPath = [...this.sigchainClaimsDbPath, claimId.toBuffer()];
    const sequenceNumberPath = [
      ...this.sigchainMetadataDbPath,
      this.sequenceNumberKey,
    ];
    if (tran == null) {
      return this.withTransactionF(
        claimIdPath,
        sequenceNumberPath,
        async (tran) => this.addClaim(claimData, tran),
      );
    }
    const prevSequenceNumber = await this.getSequenceNumber(tran);
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
      return this.withTransactionF(
        claimIdPath,
        sequenceNumberPath,
        async (tran) => this.addExistingClaim(claim, tran),
      );
    }
    const decodedClaim = claimsUtils.decodeClaim(claim);
    const prevSequenceNumber = await this.getSequenceNumber(tran);
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
    const sequenceNumberPath = [
      ...this.sigchainMetadataDbPath,
      this.sequenceNumberKey,
    ];
    if (tran == null) {
      return this.withTransactionF(sequenceNumberPath, async (tran) =>
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
      return this.withTransactionF(async (tran) => this.getChainData(tran));
    }
    const chainData: ChainDataEncoded = {};
    const readIterator = tran.iterator<ClaimEncoded>({ valueAsBuffer: false }, [
      ...this.sigchainClaimsDbPath,
    ]);
    for await (const [keyPath, claimEncoded] of readIterator) {
      const key = keyPath[0] as Buffer;
      const claimId = IdInternal.fromBuffer<ClaimId>(key);
      chainData[claimsUtils.encodeClaimId(claimId)] = claimEncoded;
    }
    return chainData;
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
  public async getClaims(
    claimType: ClaimType,
    tran?: DBTransaction,
  ): Promise<Array<ClaimEncoded>> {
    if (tran == null) {
      return this.withTransactionF(async (tran) =>
        this.getClaims(claimType, tran),
      );
    }
    const relevantClaims: Array<ClaimEncoded> = [];
    const readIterator = tran.iterator<ClaimEncoded>({ valueAsBuffer: false }, [
      ...this.sigchainClaimsDbPath,
    ]);
    for await (const [, claim] of readIterator) {
      const decodedClaim = claimsUtils.decodeClaim(claim);
      if (decodedClaim.payload.data.type === claimType) {
        relevantClaims.push(claim);
      }
    }
    return relevantClaims;
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

  /**
   * Retrieves a claim from the sigchain. If not found, throws exception.
   * Use if you always expect a claim for this particular sequence number
   * (otherwise, if you want to check for existence, just use getSigchainDb()
   * and check if returned value is undefined).
   * @param claimId the ClaimId of the claim to retrieve
   * @param tran
   * @returns the claim (a JWS)
   */
  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async getClaim(
    claimId: ClaimId,
    tran?: DBTransaction,
  ): Promise<ClaimEncoded> {
    if (tran == null) {
      return this.withTransactionF(async (tran) =>
        this.getClaim(claimId, tran),
      );
    }
    const claim = await tran.get<ClaimEncoded>([
      ...this.sigchainClaimsDbPath,
      claimId.toBuffer(),
    ]);
    if (claim == null) {
      throw new sigchainErrors.ErrorSigchainClaimUndefined();
    }
    return claim;
  }

  @ready(new sigchainErrors.ErrorSigchainNotRunning())
  public async getSeqMap(
    tran?: DBTransaction,
  ): Promise<Record<number, ClaimId>> {
    if (tran == null) {
      return this.withTransactionF(async (tran) => this.getSeqMap(tran));
    }
    const map: Record<number, ClaimId> = {};
    const claimStream = tran.iterator({ values: false }, [
      ...this.sigchainClaimsDbPath,
    ]);
    let seq = 1;
    for await (const [keyPath] of claimStream) {
      const key = keyPath[0] as Buffer;
      map[seq] = IdInternal.fromBuffer<ClaimId>(key);
      seq++;
    }
    return map;
  }

  protected async getLatestClaimId(
    tran: DBTransaction,
  ): Promise<ClaimId | undefined> {
    let latestId: ClaimId | undefined;
    const keyStream = tran.iterator(
      { limit: 1, reverse: true, values: false },
      [...this.sigchainClaimsDbPath],
    );
    for await (const [keyPath] of keyStream) {
      latestId = IdInternal.fromBuffer<ClaimId>(keyPath[0] as Buffer);
    }
    return latestId;
  }
}

export default Sigchain;
