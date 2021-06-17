import type {
  Claim,
  ClaimPayload,
  ArbitraryType,
  Cryptolink,
  SequenceNumber,
  SigchainOp,
} from './types';
import type { KeyManager } from '../keys';
import type { FileSystem } from '../types';
import type { LevelDB } from 'level';
import type { LevelUp } from 'levelup';
import type {
  AbstractBatch,
  AbstractLevelDOWN,
  AbstractIterator,
} from 'abstract-leveldown';

import path from 'path';
import level from 'level';
import subleveldown from 'subleveldown';
import sublevelprefixer from 'sublevel-prefixer';
import Logger from '@matrixai/logger';
import { createPrivateKey } from 'crypto';
import { SignJWT } from 'jose/jwt/sign';
import { Mutex } from 'async-mutex';
import { md } from 'node-forge';
import { errors as keysErrors, utils as keysUtils } from '../keys';
import * as utils from '../utils';
import * as sigchainErrors from './errors';
import * as sigchainUtils from './utils';

class Sigchain {
  public readonly sigchainPath: string;
  public readonly sigchainDbPath: string;
  protected readonly sequenceNumberKey: string = 'prevSequenceNumber';

  protected keyManager: KeyManager;
  protected fs: FileSystem;
  protected logger: Logger;

  // TODO: Async weirdness in subleveldown
  // See https://gitlab.com/MatrixAI/Engineering/Polykey/js-polykey/-/merge_requests/188#note_604731353

  // Top-level database for the sigchain domain
  protected sigchainDb: LevelDB<string, Buffer>;
  protected sigchainDbKey: Buffer;
  protected sigchainDbPrefixer: (domain: string, key: string) => string;
  // Sub-level database for the claims in the sigchain
  // SequenceNumber -> Claim (a JWS: a base64-encoded string, containing a
  // ClaimPayload type and other JWS parameters)
  // SequenceNumber is encoded as a string such that it can be used as a key
  // in subleveldown.
  protected sigchainClaimsDb: LevelUp<
    AbstractLevelDOWN<SequenceNumber, Buffer>,
    AbstractIterator<SequenceNumber, Buffer>
  >;
  // Sub-level database for numerical metadata to be persisted
  // e.g. "sequenceNumber" -> current sequence number
  protected sigchainMetadataDb: LevelUp<
    AbstractLevelDOWN<string, Buffer>,
    AbstractIterator<string, Buffer>
  >;
  protected sigchainDbMutex: Mutex = new Mutex();

  protected _started: boolean = false;

  constructor({
    sigchainPath,
    keyManager,
    fs,
    logger,
  }: {
    sigchainPath: string;
    keyManager: KeyManager;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger('SigchainManager');
    this.fs = fs ?? require('fs');
    this.keyManager = keyManager;
    this.sigchainPath = sigchainPath;
    this.sigchainDbPath = path.join(sigchainPath, 'sigchain_db');
  }

  get started(): boolean {
    return this._started;
  }

  get locked(): boolean {
    return this.sigchainDbMutex.isLocked();
  }

  public async start({
    bits = 256,
    fresh = false,
  }: {
    bits?: number;
    fresh?: boolean;
  } = {}): Promise<void> {
    try {
      if (this._started) {
        return;
      }
      this.logger.info('Starting Sigchain');
      this._started = true;
      if (!this.keyManager.started) {
        throw new keysErrors.ErrorKeyManagerNotStarted();
      }
      this.logger.info(`Setting Sigchain path to ${this.sigchainPath}`);
      if (fresh) {
        await this.fs.promises.rm(this.sigchainPath, {
          force: true,
          recursive: true,
        });
      }
      await utils.mkdirExists(this.fs, this.sigchainPath, { recursive: true });

      const {
        p: sigchainDbP,
        resolveP: resolveSigchainDbP,
        rejectP: rejectSigchainDbP,
      } = utils.promise<void>();
      const { p: sigchainClaimsDbP, resolveP: resolveSigchainClaimsDbP } =
        utils.promise<void>();
      const { p: sigchainMetadataDbP, resolveP: resolveSigchainMetadataDbP } =
        utils.promise<void>();
      const sigchainDb = level(
        this.sigchainDbPath,
        { valueEncoding: 'binary' },
        (e) => {
          if (e) {
            rejectSigchainDbP(e);
          } else {
            resolveSigchainDbP();
          }
        },
      );
      const sigchainDbKey = await this.setupSigchainDbKey(bits);
      const sigchainDbPrefixer = sublevelprefixer('!');

      // sequenceNumber -> Claim (a JWS: a base64-encoded string, containing a
      // ClaimPayload type and other JWS parameters)
      const sigchainClaimsDb = subleveldown<SequenceNumber, Buffer>(
        sigchainDb,
        'claims',
        {
          valueEncoding: 'binary',
          open: (cb) => {
            cb(undefined);
            resolveSigchainClaimsDbP();
          },
        },
      );
      // Stores numerical sigchain metadata: identifier (string) -> data (number)
      const sigchainMetadataDb = subleveldown<string, Buffer>(
        sigchainDb,
        'metadata',
        {
          valueEncoding: 'binary',
          open: (cb) => {
            cb(undefined);
            resolveSigchainMetadataDbP();
          },
        },
      );
      await Promise.all([sigchainDbP, sigchainClaimsDbP, sigchainMetadataDbP]);
      this.sigchainDb = sigchainDb;
      this.sigchainDbKey = sigchainDbKey;
      this.sigchainDbPrefixer = sigchainDbPrefixer;
      this.sigchainClaimsDb = sigchainClaimsDb;
      this.sigchainMetadataDb = sigchainMetadataDb;

      // Initialise the sequence number (if not already done).
      // First claim in the sigchain has a sequence number of 1.
      // Therefore, with no claims in the sigchain, the previous sequence number
      // is set to 0.
      await this._transaction(async () => {
        const sequenceNumber = await this.getSigchainDb(
          'metadata',
          this.sequenceNumberKey,
        );
        if (sequenceNumber == null) {
          await this.putSigchainDb('metadata', this.sequenceNumberKey, 0);
        }
      });

      this.logger.info('Started Sigchain');
    } catch (e) {
      this._started = false;
      throw e;
    }
  }

  public async stop() {
    if (!this._started) {
      return;
    }
    this.logger.info('Stopping Sigchain');
    this._started = false;
    await this.sigchainDb.close();
    this.logger.info('Stopped Sigchain');
  }

  // Following transaction functions copied from ACL.ts:
  /**
   * Run several operations within the same lock
   * This does not ensure atomicity of the underlying database
   * Database atomicity still depends on the underlying operation
   */
  public async transaction<T>(
    f: (sigchain: Sigchain) => Promise<T>,
  ): Promise<T> {
    const release = await this.sigchainDbMutex.acquire();
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
    if (this.sigchainDbMutex.isLocked()) {
      return await f();
    } else {
      return await this.transaction(f);
    }
  }

  /**
   * Helper function to generate a JWS containing the contents of the claim to be
   * added to the sigchain. Generalised such that any type of ClaimPayload can
   * be passed.
   * @param payload the data to appear in the claim's payload
   * @param linkId the unique ID of the link
   * @returns the JWS itself (a base64 encoded string)
   */
  protected async createClaim(payload: ClaimPayload): Promise<Claim> {
    const claim = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256' })
      // TODO: Add node ID to the claim
      .setIssuedAt()
      .sign(
        await createPrivateKey(this.keyManager.getRootKeyPairPem().privateKey),
      );
    return claim as Claim;
  }

  /**
   * Appends a cryptolink claim to the sigchain.
   */
  public async addCryptolink(link: Cryptolink): Promise<void> {
    await this._transaction(async () => {
      // Compose the properties of the ClaimPayload
      const prevSequenceNumber = await this.getSequenceNumber();
      // Hash of previous claim:
      let hashPrevious;
      if (prevSequenceNumber == 0) {
        // If no other claims, then set as null
        hashPrevious = null;
      } else {
        // Otherwise, create a SHA256 hash of the previous claim
        hashPrevious = md.sha256.create();
        const previousClaim = await this.getClaim(prevSequenceNumber);
        hashPrevious.update(previousClaim);
        hashPrevious = hashPrevious.digest().toHex();
      }
      // Sequence number:
      const newSequenceNumber = prevSequenceNumber + 1;

      const claimPayload: ClaimPayload = {
        hashPrevious: hashPrevious,
        sequenceNumber: newSequenceNumber,
        claimData: link,
      };
      const claim = await this.createClaim(claimPayload);

      // Add the claim to the sigchain database, and update the sequence number
      const ops: Array<SigchainOp> = [
        {
          type: 'put',
          domain: 'claims',
          key: newSequenceNumber.toString() as SequenceNumber,
          value: claim,
        },
        {
          type: 'put',
          domain: 'metadata',
          key: this.sequenceNumberKey,
          value: newSequenceNumber,
        },
      ];
      await this.batchSigchainDb(ops);
    });
  }

  // Used for testing purposes only.
  // TODO: Once we introduce some other claim type, this can be removed.
  public async addArbitraryClaim(): Promise<void> {
    await this._transaction(async () => {
      // Compose the properties of the ClaimPayload
      const prevSequenceNumber = await this.getSequenceNumber();
      // Hash of previous claim:
      let hashPrevious;
      if (prevSequenceNumber == 0) {
        // If no other claims, then set as null
        hashPrevious = null;
      } else {
        // Otherwise, create a SHA256 hash of the previous claim
        hashPrevious = md.sha256.create();
        const previousClaim = await this.getClaim(prevSequenceNumber);
        hashPrevious.update(previousClaim);
        hashPrevious = hashPrevious.digest().toHex();
      }
      // Sequence number:
      const newSequenceNumber = prevSequenceNumber + 1;

      const arbitraryData: ArbitraryType = {
        claimType: 'arbitrary',
      };

      const claimPayload: ClaimPayload = {
        hashPrevious: hashPrevious,
        sequenceNumber: newSequenceNumber,
        claimData: arbitraryData,
      };
      const claim = await this.createClaim(claimPayload);

      // Add the claim to the sigchain database, and update the sequence number
      const ops: Array<SigchainOp> = [
        {
          type: 'put',
          domain: 'claims',
          key: newSequenceNumber.toString() as SequenceNumber,
          value: claim,
        },
        {
          type: 'put',
          domain: 'metadata',
          key: this.sequenceNumberKey,
          value: newSequenceNumber,
        },
      ];
      await this.batchSigchainDb(ops);
    });
  }

  /**
   * Retrieve all claims from the entire sigchain.
   * i.e. from 1 to prevSequenceNumber
   * @returns array of base64url encoded claims. Use sigchainUtils.decodeClaim()
   * to decode each claim.
   */
  public async getAllClaims(): Promise<Array<Claim>> {
    return await this._transaction(async () => {
      const claims: Array<Claim> = [];
      for await (const o of this.sigchainClaimsDb.createReadStream()) {
        const data = (o as any).value;
        const claim = sigchainUtils.unserializeDecrypt<Claim>(
          this.sigchainDbKey,
          data,
        );
        claims.push(claim);
      }
      return claims;
    });
  }

  // No verification performed here - should be done by the requesting client.
  // TODO: Currently, all claims in the sigchain are regarded as additions -
  // we have no notion of revocations/deletions. Thus, this method simply
  // fetches ALL claims in the sigchain that are of type 'cryptolink'.
  // TODO: Could generalise this for all ClaimTypes.
  // i.e. have a type ClaimType = 'cryptolink' | ...
  // and then pass it in as a parameter
  public async getAllCryptolinks(): Promise<Array<Claim>> {
    return await this._transaction(async () => {
      const cryptolinks: Array<Claim> = [];
      const allClaims = await this.getAllClaims();
      for (const claim of allClaims) {
        const decodedClaim = sigchainUtils.decodeClaim(claim);
        if (decodedClaim.payload.claimData.claimType == 'cryptolink') {
          cryptolinks.push(claim);
        }
      }
      return cryptolinks;
    });
  }

  /**
   * Retrieves the sequence number from the metadata database of the most recent
   * claim in the sigchain (i.e. the previous sequence number).
   * @returns previous sequence number
   */
  public async getSequenceNumber(): Promise<number> {
    return await this._transaction(async () => {
      const sequenceNumber = await this.getSigchainDb(
        'metadata',
        this.sequenceNumberKey,
      );
      // Should never be reached: getSigchainDb() has a check whether sigchain
      // has been started (where the sequence number is initialised)
      if (sequenceNumber == undefined) {
        throw new sigchainErrors.ErrorSigchainSequenceNumUndefined();
      }
      return sequenceNumber;
    });
  }

  /**
   * Retrieves a claim from the sigchain. If not found, throws exception.
   * Use if you always expect a claim for this particular sequence number
   * (otherwise, if you want to check for existence, just use getSigchainDb()
   * and check if returned value is undefined).
   * @param sequenceNumber the sequence number of the claim to retrieve
   * @returns the claim (a JWS)
   */
  public async getClaim(sequenceNumber: number): Promise<Claim> {
    return await this._transaction(async () => {
      const claim = await this.getSigchainDb(
        'claims',
        sequenceNumber.toString() as SequenceNumber,
      );
      if (claim == undefined) {
        throw new sigchainErrors.ErrorSigchainClaimUndefined();
      }
      return claim;
    });
  }

  protected async setupSigchainDbKey(bits: number = 256): Promise<Buffer> {
    let sigchainDbKey = await this.keyManager.getKey(this.constructor.name);
    if (sigchainDbKey != null) {
      return sigchainDbKey;
    }
    this.logger.info('Generating Sigchain db key');
    sigchainDbKey = await keysUtils.generateKey(bits);
    await this.keyManager.putKey(this.constructor.name, sigchainDbKey);
    return sigchainDbKey;
  }

  protected async getSigchainDb(
    domain: 'claims',
    key: SequenceNumber,
  ): Promise<Claim | undefined>;
  protected async getSigchainDb(
    domain: 'metadata',
    key: string,
  ): Promise<number | undefined>;
  protected async getSigchainDb(domain: any, key: any): Promise<any> {
    if (!this._started) {
      throw new sigchainErrors.ErrorSigchainNotStarted();
    }
    let data: Buffer;
    try {
      data = await this.sigchainDb.get(this.sigchainDbPrefixer(domain, key));
    } catch (e) {
      if (e.notFound) {
        return undefined;
      }
      throw e;
    }
    return sigchainUtils.unserializeDecrypt(this.sigchainDbKey, data);
  }

  protected async putSigchainDb(
    domain: 'claims',
    key: SequenceNumber,
    value: Claim,
  ): Promise<void>;
  protected async putSigchainDb(
    domain: 'metadata',
    key: string,
    value: number,
  ): Promise<void>;
  protected async putSigchainDb(
    domain: any,
    key: any,
    value: any,
  ): Promise<void> {
    if (!this._started) {
      throw new sigchainErrors.ErrorSigchainNotStarted();
    }
    const data = sigchainUtils.serializeEncrypt(this.sigchainDbKey, value);
    await this.sigchainDb.put(this.sigchainDbPrefixer(domain, key), data);
  }

  protected async delSigchainDb(
    domain: 'claims',
    key: SequenceNumber,
  ): Promise<void>;
  protected async delSigchainDb(domain: 'metadata', key: string): Promise<void>;
  protected async delSigchainDb(domain: any, key: any): Promise<void> {
    if (!this._started) {
      throw new sigchainErrors.ErrorSigchainNotStarted();
    }
    await this.sigchainDb.del(this.sigchainDbPrefixer(domain, key));
  }

  protected async batchSigchainDb(ops: Array<SigchainOp>): Promise<void> {
    if (!this._started) {
      throw new sigchainErrors.ErrorSigchainNotStarted();
    }
    const ops_: Array<AbstractBatch> = [];
    for (const op of ops) {
      if (op.type === 'del') {
        ops_.push({
          type: op.type,
          key: this.sigchainDbPrefixer(op.domain, op.key),
        });
      } else if (op.type === 'put') {
        const data = sigchainUtils.serializeEncrypt(
          this.sigchainDbKey,
          op.value,
        );
        ops_.push({
          type: op.type,
          key: this.sigchainDbPrefixer(op.domain, op.key),
          value: data,
        });
      }
    }
    await this.sigchainDb.batch(ops_);
  }
}

export default Sigchain;
