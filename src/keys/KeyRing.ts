import type {
  Key,
  KeyPair,
  KeyPairLocked,
  PublicKey,
  PrivateKey,
  SecretKey,
  RecoveryCode,
  Signature,
  PasswordHash,
  PasswordSalt,
  BufferLocked,
  RecoveryCodeLocked,
  PasswordOpsLimit,
  PasswordMemLimit,
} from './types';
import type { NodeId } from '../ids/types';
import type { PolykeyWorkerManagerInterface } from '../workers/types';
import type { FileSystem } from '../types';
import path from 'path';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { Lock } from '@matrixai/async-locks';
import * as keysUtils from './utils';
import * as keysErrors from './errors';
import { bufferLock, bufferUnlock } from './utils/memory';

interface KeyRing extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new keysErrors.ErrorKeyRingRunning(),
  new keysErrors.ErrorKeyRingDestroyed(),
)
class KeyRing {
  public static async createKeyRing({
    keysPath,
    workerManager,
    passwordOpsLimit,
    passwordMemLimit,
    strictMemoryLock = true,
    fs = require('fs'),
    logger = new Logger(this.name),
    ...startOptions
  }: {
      keysPath: string;
      password: string;
      workerManager?: PolykeyWorkerManagerInterface;
      passwordOpsLimit?: PasswordOpsLimit;
      passwordMemLimit?: PasswordMemLimit;
      strictMemoryLock?: boolean;
      fs?: FileSystem;
      logger?: Logger;
      fresh?: boolean;
    } & (
      { } | {
        recoveryCode: RecoveryCode
      } | {
        privateKey: PrivateKey;
      } | {
        privateKeyPath: string;
      }
    )
  ): Promise<KeyRing> {
    logger.info(`Creating ${this.name}`);
    logger.info(`Setting keys path to ${keysPath}`);
    const keyRing = new this({
      keysPath,
      workerManager,
      passwordOpsLimit,
      passwordMemLimit,
      strictMemoryLock,
      fs,
      logger,
    });
    await keyRing.start(startOptions);
    logger.info(`Created ${this.name}`);
    return keyRing;
  }

  public readonly keysPath: string;
  public readonly publicKeyPath: string;
  public readonly privateKeyPath: string;
  public readonly dbKeyPath: string;
  public readonly strictMemoryLock: boolean;

  protected logger: Logger;
  protected fs: FileSystem;
  protected workerManager?: PolykeyWorkerManagerInterface;
  protected _keyPair?: KeyPairLocked;
  protected _dbKey?: BufferLocked<Key>;
  protected passwordHash?: Readonly<{
    hash: BufferLocked<PasswordHash>,
    salt: BufferLocked<PasswordSalt>
  }>;
  protected passwordOpsLimit?: PasswordOpsLimit;
  protected passwordMemLimit?: PasswordMemLimit;
  protected _recoveryCodeData?: RecoveryCodeLocked;
  protected rotateLock: Lock = new Lock();

  public constructor({
    keysPath,
    workerManager,
    passwordOpsLimit,
    passwordMemLimit,
    strictMemoryLock,
    fs,
    logger,
  }: {
    keysPath: string;
    workerManager?: PolykeyWorkerManagerInterface;
    passwordOpsLimit?: PasswordOpsLimit;
    passwordMemLimit?: PasswordMemLimit;
    strictMemoryLock: boolean;
    fs: FileSystem;
    logger: Logger;
  }) {
    this.logger = logger;
    this.keysPath = keysPath;
    this.workerManager = workerManager;
    this.fs = fs;
    this.passwordOpsLimit = passwordOpsLimit;
    this.passwordMemLimit = passwordMemLimit;
    this.strictMemoryLock = strictMemoryLock;
    this.publicKeyPath = path.join(keysPath, 'public.jwk');
    this.privateKeyPath = path.join(keysPath, 'private.jwk');
    this.dbKeyPath = path.join(keysPath, 'db.jwk');
  }

  public setWorkerManager(workerManager: PolykeyWorkerManagerInterface) {
    this.workerManager = workerManager;
  }

  public unsetWorkerManager() {
    delete this.workerManager;
  }

  public async start(options: {
    password: string;
    fresh?: boolean;
  } & (
    { } |
    { recoveryCode: RecoveryCode; } |
    { privateKey: PrivateKey; } |
    { privateKeyPath: string; }
  )): Promise<void> {
    const { fresh = false, ...setupKeyPairOptions } = options;
    this.logger.info(`Starting ${this.constructor.name}`);
    if (options.fresh) {
      await this.fs.promises.rm(this.keysPath, {
        force: true,
        recursive: true,
      });
    }
    await this.fs.promises.mkdir(this.keysPath, { recursive: true });
    const [keyPair, recoveryCode] = await this.setupKeyPair(
      setupKeyPairOptions,
    );
    const dbKey = await this.setupDbKey(keyPair);
    const [passwordHash, passwordSalt] = await this.setupPasswordHash(options.password);
    this._keyPair = keyPair as {
      publicKey: BufferLocked<PublicKey>;
      privateKey: BufferLocked<PrivateKey>;
      secretKey: BufferLocked<SecretKey>;
    };
    this._dbKey = dbKey;
    this.passwordHash = {
      hash: passwordHash,
      salt: passwordSalt
    };
    if (recoveryCode != null) {
      const recoveryCodeData = Buffer.from(recoveryCode, 'utf-8');
      bufferLock(recoveryCodeData, this.strictMemoryLock);
      this._recoveryCodeData = recoveryCodeData as RecoveryCodeLocked;
    }
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    if (this._keyPair != null) {
      bufferUnlock(this._keyPair.publicKey);
      bufferUnlock(this._keyPair.privateKey);
      bufferUnlock(this._keyPair.secretKey);
    }
    delete this._keyPair;
    if (this._recoveryCodeData != null) {
      bufferUnlock(this._recoveryCodeData);
    }
    delete this._recoveryCodeData;
    if (this.passwordHash != null) {
      bufferUnlock(this.passwordHash.hash);
      bufferUnlock(this.passwordHash.salt);
    }
    delete this.passwordHash;
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    delete this._dbKey;
    await this.fs.promises.rm(this.keysPath, {
      force: true,
      recursive: true,
    });
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @ready(new keysErrors.ErrorKeyRingNotRunning())
  get keyPair(): KeyPairLocked {
    return this._keyPair!;
  }

  @ready(new keysErrors.ErrorKeyRingNotRunning())
  get dbKey(): BufferLocked<Key> {
    return this._dbKey!;
  }

  @ready(new keysErrors.ErrorKeyRingNotRunning())
  get recoveryCode(): RecoveryCode | undefined {
    return this._recoveryCodeData?.toString('utf-8') as RecoveryCode;
  }

  @ready(new keysErrors.ErrorKeyRingNotRunning())
  public getNodeId(): NodeId {
    return keysUtils.publicKeyToNodeId(this._keyPair!.publicKey);
  }

  /**
   * Warning: this is intended to be a slow operation to prevent brute force
   * attacks
   */
  @ready(new keysErrors.ErrorKeyRingNotRunning())
  public async checkPassword(password: string): Promise<boolean> {
    if (this.workerManager == null) {
      return keysUtils.checkPassword(
        password,
        this.passwordHash!.hash,
        this.passwordHash!.salt,
        this.passwordOpsLimit,
        this.passwordMemLimit,
      );
    } else {
      return await this.workerManager.call(async (w) => {
        return await w.checkPassword(
          password,
          this.passwordHash!.hash.buffer,
          this.passwordHash!.salt.buffer,
          this.passwordOpsLimit,
          this.passwordMemLimit,
        );
      });
    }
  }

  /**
   * Changes the root key pair password.
   * This will re-wrap the private key.
   * The password is the new password.
   * This does not require the old password because
   * if the `KeyRing` is ready, that means the agent is unlocked
   * at least from the perspective of the `KeyRing`.
   * If an external client intends to change the password,
   * they must be authenticated first.
   */
  @ready(new keysErrors.ErrorKeyRingNotRunning())
  public async changePassword(password: string): Promise<void> {
    await this.rotateLock.withF(async () => {
      this.logger.info('Changing root key pair password');
      await this.writeKeyPair(this._keyPair!, password);
      const [passwordHash, passwordSalt] = await this.setupPasswordHash(password);
      this.passwordHash = {
        hash: passwordHash,
        salt: passwordSalt
      };
      this.logger.info('Changed root key pair password');
    });
  }

  /**
   * Rotates the key pair.
   * This generates a new recovery code and new key pair.
   * The DB key is not rotated, it is just re-encrypted with the new key pair.
   * The key pair is wrapped with the new password.
   */
  @ready(new keysErrors.ErrorKeyRingNotRunning())
  public async rotateKeyPair(
    password: string,
    rotateHook?: (
      keyPairNew: KeyPair,
      keyPairOld: KeyPair,
      recoveryCodeNew: RecoveryCode,
      recoveryCodeOld?: RecoveryCode,
    ) => any,
  ): Promise<void> {
    await this.rotateLock.withF(async () => {
      this.logger.info('Rotating root key pair');
      try {
        this.logger.info('Backing up root key pair and DB key');
        await Promise.all([
          this.fs.promises.copyFile(
            this.publicKeyPath,
            `${this.publicKeyPath}.bak`
          ),
          this.fs.promises.copyFile(
            this.privateKeyPath,
            `${this.privateKeyPath}.bak`
          ),
          this.fs.promises.copyFile(
            this.dbKeyPath,
            `${this.dbKeyPath}.bak`
          )
        ]);
      } catch (e) {
        this.logger.error('Failed backing up root key pair and DB key');
        try {
          await Promise.all([
            this.fs.promises.rm(
              `${this.publicKeyPath}.bak`,
              { force: true, }
            ),
            this.fs.promises.rm(
              `${this.privateKeyPath}.bak`,
              { force: true }
            ),
            this.fs.promises.rm(
              `${this.dbKeyPath}.bak`,
              { force: true }
            )
          ]);
        } catch (e) {
          // Any error here should not terminate the program
          this.logger.error(`Failed to remove backups due to \`${e}\``);
        }
        throw new keysErrors.ErrorKeyPairRotate(
          'Failed backing up root key pair and DB key',
          { cause: e }
        );
      }
      try {
        const recoveryCode = keysUtils.generateRecoveryCode(24);
        const keyPair = await this.generateKeyPair(recoveryCode);
        if (rotateHook != null) {
          // Intercepting callback used for generating a certificate
          await rotateHook(
            keyPair,
            this._keyPair!,
            recoveryCode,
            this._recoveryCodeData?.toString('utf-8') as RecoveryCode,
          );
        }
        await Promise.all([
          this.writeKeyPair(keyPair, password),
          this.writeDbKey(this._dbKey!, keyPair.publicKey),
        ]);
        bufferUnlock(this._keyPair!.publicKey);
        bufferUnlock(this._keyPair!.privateKey);
        bufferUnlock(this._keyPair!.secretKey);
        this._keyPair = keyPair;
        const recoveryCodeData = Buffer.from(recoveryCode, 'utf-8');
        bufferLock(recoveryCodeData, this.strictMemoryLock);
        if (this._recoveryCodeData != null) bufferUnlock(this._recoveryCodeData);
        this._recoveryCodeData = recoveryCodeData as RecoveryCodeLocked;
        this.logger.info('Rotated root key pair');
      } catch (e) {
        this.logger.error('Failed rotating root key pair, recovering from backups');
        try {
          await Promise.all([
            this.fs.promises.rename(
              `${this.publicKeyPath}.bak`,
              this.publicKeyPath,
            ),
            this.fs.promises.rename(
              `${this.privateKeyPath}.bak`,
              this.privateKeyPath,
            ),
            this.fs.promises.rename(
              `${this.dbKeyPath}.bak`,
              this.dbKeyPath,
            )
          ]);
        } catch (e) {
          // Any error here should not terminate the program
          this.logger.error(`Failed to recover from backups due to \`${e}\``);
          // If this happens, the user will need to recover manually
        }
        throw new keysErrors.ErrorKeyPairRotate(
          'Failed rotating root key pair',
          { cause: e }
        );
      }
    });
  }

  /**
   * Encrypt to a public key.
   * The `authenticated` option is used to determine whether to use
   * the static root key pair. By default it will use generate an ephemeral key pair.
   * Neither ensures forward secrecy. However ephemeral key pair provides one-way
   * forward secrecy.
   * If it is important that the receiver can authenticate the sender, consider doing
   * `sign-then-encrypt`, by adding a signature into the plain text being sent.
   */
  @ready(new keysErrors.ErrorKeyRingNotRunning())
  public encrypt(
    receiverPublicKey: PublicKey,
    plainText: Buffer,
    authenticated: boolean = false
  ): Buffer {
    return keysUtils.encryptWithPublicKey(
      receiverPublicKey,
      plainText,
      (authenticated) ? this._keyPair : undefined
    );
  }

  /**
   * Decrypt data sent to this key pair
   * Note that this does not automatically authenticate the sender.
   */
  @ready(new keysErrors.ErrorKeyRingNotRunning())
  public decrypt(cipherText: Buffer): Buffer | undefined {
    return keysUtils.decryptWithPrivateKey(
      this._keyPair!,
      cipherText,
    );
  }

  @ready(new keysErrors.ErrorKeyRingNotRunning())
  public sign(data: Buffer): Signature {
    return keysUtils.signWithPrivateKey(this._keyPair!, data);
  }

  @ready(new keysErrors.ErrorKeyRingNotRunning())
  public verify(
    publicKey: PublicKey,
    data: Buffer,
    signature: Signature,
  ): boolean {
    return keysUtils.verifyWithPublicKey(publicKey, data, signature);
  }

  /**
   * Sets up the root key pair.
   * If the root key pair already exists:
   *   - If password is supplied, the key pair is decrypted with the password.
   *     The key pair is returned without the recovery code.
   *   - If password and recovery code is supplied, then the key pair will be
   *     recovered.
   *     The recovery code is used to derive a key pair that is checked against
   *     the existing key pair.
   *     If the key pairs match, then the derived key pair is encrypted with
   *     the password.
   *     The key pair is returned without the recovery code.
   *   - Private key and private key path is ignored, and this is handled the
   *     same as if only the password was supplied.
   * If the root key pair does not exist:
   *   - If password is supplied, then recovery code and key pair is generated.
   *     The key pair is encrypted with the password.
   *     The key pair and recovery code will be returned.
   *   - If password and recovery code is supplied, then it will be used for key pair generation.
   *     The key pair is encrypted with the password.
   *     The key pair and recovery code will be returned.
   *   - If password and private key is supplied, then key pair will be derived from the private key.
   *     The key pair is encrypted with the password.
   *     The key pair is returned without the recovery code.
   */
  protected async setupKeyPair(options: {
    password: string;
  } | {
    password: string;
    recoveryCode: RecoveryCode;
  } | {
    password: string;
    privateKey: PrivateKey;
  } | {
    password: string;
    privateKeyPath: string;
  }): Promise<[KeyPairLocked, RecoveryCode | undefined]> {
    let rootKeyPair: KeyPairLocked;
    let recoveryCodeNew: RecoveryCode | undefined;
    if (await this.existsKeyPair()) {
      if ('recoveryCode' in options && options.recoveryCode != null) {
        // Recover the key pair
        this.logger.info('Recovering root key pair');
        const recoveredKeyPair = await this.recoverKeyPair(options.recoveryCode);
        if (recoveredKeyPair == null) {
          throw new keysErrors.ErrorKeysRecoveryCodeIncorrect();
        }
        // Recovered key pair, write the key pair with the new password
        rootKeyPair = recoveredKeyPair;
        await this.writeKeyPair(recoveredKeyPair, options.password);
      } else {
        // Load key pair by decrypting with password
        this.logger.info('Loading root key pair');
        rootKeyPair = await this.readKeyPair(options.password);
      }
      return [rootKeyPair, undefined];
    } else {
      if ('recoveryCode' in options && options.recoveryCode != null) {
        this.logger.info('Generating root key pair from recovery code');
        // Deterministic key pair generation from recovery code
        // Recovery code is new by virtue of generating key pair
        recoveryCodeNew = options.recoveryCode;
        rootKeyPair = await this.generateKeyPair(options.recoveryCode);
        await this.writeKeyPair(rootKeyPair, options.password);
        return [rootKeyPair, recoveryCodeNew];
      } else if ('privateKey' in options && options.privateKey != null) {
        this.logger.info('Making root key pair from provided private key');
        const privateKey = options.privateKey;
        const publicKey = keysUtils.publicKeyFromPrivateKeyEd25519(privateKey);
        const keyPair = keysUtils.makeKeyPair(publicKey, privateKey);
        bufferLock(keyPair.publicKey, this.strictMemoryLock);
        bufferLock(keyPair.privateKey, this.strictMemoryLock);
        bufferLock(keyPair.secretKey, this.strictMemoryLock);
        rootKeyPair = keyPair as KeyPairLocked;
        await this.writeKeyPair(rootKeyPair, options.password);
        return [rootKeyPair, undefined];
      } else if ('privateKeyPath' in options && options.privateKeyPath != null) {
        this.logger.info('Making root key pair from provided private key path');
        const privateKey = await this.readPrivateKey(
          options.password,
          options.privateKeyPath
        );
        const publicKey = keysUtils.publicKeyFromPrivateKeyEd25519(privateKey);
        const keyPair = keysUtils.makeKeyPair(publicKey, privateKey);
        bufferLock(keyPair.publicKey, this.strictMemoryLock);
        bufferLock(keyPair.privateKey, this.strictMemoryLock);
        bufferLock(keyPair.secretKey, this.strictMemoryLock);
        rootKeyPair = keyPair as KeyPairLocked;
        await this.writeKeyPair(rootKeyPair, options.password);
        return [rootKeyPair, undefined];
      } else {
        this.logger.info('Generating root key pair and recovery code');
        // Randomly generated recovery code
        recoveryCodeNew = keysUtils.generateRecoveryCode(24);
        rootKeyPair = await this.generateKeyPair(recoveryCodeNew);
        await this.writeKeyPair(rootKeyPair, options.password);
        return [rootKeyPair, recoveryCodeNew];
      }
    }
  }

  /**
   * Only the private key is necessary.
   * We can derive the public key from the private key.
   */
  protected async existsKeyPair(): Promise<boolean> {
    this.logger.info(`Checking ${this.privateKeyPath}`);
    try {
      await this.fs.promises.access(
        this.privateKeyPath,
        this.fs.constants.F_OK |
          this.fs.constants.R_OK |
          this.fs.constants.W_OK,
      );
    } catch (e) {
      if (e.code === 'ENOENT') {
        return false;
      }
      throw new keysErrors.ErrorKeyPairRead(
        `Failed to check for existence of ${this.privateKeyPath}`,
        { cause: e }
      );
    }
    return true;
  }

  protected async existsPublicKey(): Promise<boolean> {
    try {
      await this.fs.promises.access(
        this.publicKeyPath,
        this.fs.constants.F_OK |
          this.fs.constants.R_OK |
          this.fs.constants.W_OK,
      );
    } catch (e) {
      if (e.code === 'ENOENT') {
        return false;
      }
      throw new keysErrors.ErrorKeyPairRead(e.message, { cause: e });
    }
    return true;
  }

  protected async existsPrivateKey(): Promise<boolean> {
    try {
      await this.fs.promises.access(
        this.privateKeyPath,
        this.fs.constants.F_OK |
          this.fs.constants.R_OK |
          this.fs.constants.W_OK,
      );
    } catch (e) {
      if (e.code === 'ENOENT') {
        return false;
      }
      throw new keysErrors.ErrorKeyPairRead(e.message, { cause: e });
    }
    return true;
  }

  /**
   * Reads the key pair from the filesystem.
   * This only needs to read the private key as the public key is derived.
   * The private key is expected to be stored in a flattened JWE format.
   */
  protected async readKeyPair(password: string): Promise<KeyPairLocked> {
    const privateKey = await this.readPrivateKey(password);
    const publicKey = keysUtils.publicKeyFromPrivateKeyEd25519(
      privateKey,
    );
    const keyPair = keysUtils.makeKeyPair(publicKey, privateKey);
    // Private key is already locked
    bufferLock(keyPair.publicKey, this.strictMemoryLock);
    bufferLock(keyPair.secretKey, this.strictMemoryLock);
    return keyPair as KeyPairLocked;
  }

  /**
   * Reads the public key from the filesystem.
   * The public key is expected to be stored in a flattened JWE format.
   */
  protected async readPublicKey(
    publicKeyPath: string = this.publicKeyPath
  ): Promise<BufferLocked<PublicKey>> {
    let publicJWKJSON: string;
    try {
      publicJWKJSON = await this.fs.promises.readFile(
        publicKeyPath,
        'utf-8',
      );
    } catch (e) {
      throw new keysErrors.ErrorKeyPairRead(
        `Public key path ${publicKeyPath} cannot be read`,
        { cause: e }
      );
    }
    let publicJWK: any;
    try {
      publicJWK = JSON.parse(publicJWKJSON);
    } catch (e) {
      throw new keysErrors.ErrorKeyPairParse(
        `Public key path ${publicKeyPath} is not a valid JSON file`,
        { cause: e }
      );
    }
    const publicKey = keysUtils.publicKeyFromJWK(publicJWK);
    if (publicKey == null) {
      throw new keysErrors.ErrorKeyPairParse(
        `Public key path ${publicKeyPath} is not a valid public key`
      );
    }
    bufferLock(publicKey, this.strictMemoryLock);
    return publicKey;
  }

  /**
   * Reads the private key from the filesystem.
   * The private key is expected to be stored in a flattened JWE format.
   */
  protected async readPrivateKey(
    password: string,
    privateKeyPath: string = this.privateKeyPath,
  ): Promise<BufferLocked<PrivateKey>> {
    let privateJSON: string;
    try {
      privateJSON = await this.fs.promises.readFile(
        privateKeyPath,
        'utf-8',
      );
    } catch (e) {
      throw new keysErrors.ErrorKeyPairRead(
        `Private key path ${privateKeyPath} cannot be read`,
        { cause: e }
      );
    }
    let privateObject: any;
    try {
      privateObject = JSON.parse(privateJSON);
    } catch (e) {
      throw new keysErrors.ErrorKeyPairParse(
        `Private key path ${privateKeyPath} is not a valid JSON file`,
        { cause: e }
      );
    }
    if ('kty' in privateObject && privateObject.kty != null) {
      const privateKey = keysUtils.privateKeyFromJWK(privateObject);
      if (privateKey == null) {
        throw new keysErrors.ErrorKeyPairParse(
          `Private key path ${privateKeyPath} is not a valid JWK`
        );
      }
      bufferLock(privateKey, this.strictMemoryLock);
      return privateKey;
    } else if ('ciphertext' in privateObject && privateObject.ciphertext != null) {
      const privateJWK = keysUtils.unwrapWithPassword(
        password,
        privateObject,
        this.passwordOpsLimit,
        this.passwordMemLimit
      );
      if (privateJWK == null) {
        throw new keysErrors.ErrorKeyPairParse(
          `Private key path ${privateKeyPath} is not a valid encrypted JWK`
        );
      }
      const privateKey = keysUtils.privateKeyFromJWK(privateJWK);
      if (privateKey == null) {
        throw new keysErrors.ErrorKeyPairParse(
          `Private key path ${privateKeyPath} is not a valid private key`
        );
      }
      bufferLock(privateKey, this.strictMemoryLock);
      return privateKey;
    } else {
      throw new keysErrors.ErrorKeyPairParse(
        `Private key path ${privateKeyPath} has to be a JWK or an encrypted JWK`
      );
    }
  }

  /**
   * Writes the root key pair to the filesystem.
   * The public key will be stored in JWK format.
   * The private key will be stored in flattened JWE format.
   * This first writes the public key and private key to `.tmp` files.
   * Then proceeds to atomically rename the files together.
   * The files should be updated together to ensure consistency.
   */
  protected async writeKeyPair(
    keyPair: KeyPair,
    password: string,
  ): Promise<void> {
    const publicJWK = keysUtils.publicKeyToJWK(keyPair.publicKey);
    const privateJWK = keysUtils.privateKeyToJWK(keyPair.privateKey);
    const publicJWKJSON = JSON.stringify(publicJWK);
    const privateJWE = keysUtils.wrapWithPassword(
      password,
      privateJWK,
      this.passwordOpsLimit,
      this.passwordMemLimit,
    );
    const privateJWEJSON = JSON.stringify(privateJWE);
    try {
      // Write to temporary files first, then atomically rename
      await Promise.all([
        this.fs.promises.writeFile(`${this.publicKeyPath}.tmp`, publicJWKJSON, 'utf-8'),
        this.fs.promises.writeFile(
          `${this.privateKeyPath}.tmp`,
          privateJWEJSON,
          'utf-8'
        ),
      ]);
      await Promise.all([
        this.fs.promises.rename(
          `${this.publicKeyPath}.tmp`,
          this.publicKeyPath,
        ),
        this.fs.promises.rename(
          `${this.privateKeyPath}.tmp`,
          this.privateKeyPath,
        ),
      ]);
    } catch (e) {
      throw new keysErrors.ErrorKeyPairWrite(
        `Key pair paths ${this.publicKeyPath} and ${this.privateKeyPath} cannot be written to`,
        { cause: e }
      );
    }
  }

  /**
   * Generates the root key pair.
   * If recovery code is passed in, it is used as a deterministic seed.
   */
  protected async generateKeyPair(
    recoveryCode?: RecoveryCode,
  ): Promise<KeyPairLocked> {
    let keyPair: KeyPair;
    if (recoveryCode != null) {
      if (this.workerManager == null) {
        keyPair = await keysUtils.generateDeterministicKeyPair(recoveryCode);
      } else {
        keyPair = await this.workerManager.call(async (w) => {
          const result = await w.generateDeterministicKeyPair(recoveryCode);
          result.publicKey = Buffer.from(result.publicKey);
          result.privateKey = Buffer.from(result.privateKey);
          result.secretKey = Buffer.from(result.secretKey);
          return result as KeyPair;
        });
      }
    } else {
      keyPair = keysUtils.generateKeyPair();
    }
    bufferLock(keyPair.publicKey, this.strictMemoryLock);
    bufferLock(keyPair.privateKey, this.strictMemoryLock);
    bufferLock(keyPair.secretKey, this.strictMemoryLock);
    return keyPair as KeyPairLocked;
  }

  protected async recoverKeyPair(
    recoveryCode: RecoveryCode,
  ): Promise<KeyPairLocked | undefined> {
    const recoveredKeyPair = await this.generateKeyPair(recoveryCode);
    // If the public key exists, we can check that the public keys match
    if (await this.existsPublicKey()) {
      try {
        const publicKey = await this.readPublicKey();
        if (!publicKey.equals(recoveredKeyPair.publicKey)) {
          return;
        }
      } catch {
        return;
      }
    }
    // If the db key exists, we can check that it can be decrypted
    if (await this.existsDbKey()) {
      try {
        await this.readDbKey(recoveredKeyPair);
      } catch {
        // If the DB key could not be decrypted, then this recovered key is incorrect
        return;
      }
    }
    return recoveredKeyPair;
  }

  /**
   * Setup the DB key.
   * This is the data encryption key for the rest of PK.
   * This is what makes PK a hybrid cryptosystem.
   */
  protected async setupDbKey(keyPair: KeyPair): Promise<BufferLocked<Key>> {
    let dbKey: BufferLocked<Key>;
    if (await this.existsDbKey()) {
      dbKey = await this.readDbKey(keyPair);
    } else {
      this.logger.info('Generating db key');
      dbKey = this.generateDbKey();
      await this.writeDbKey(dbKey, keyPair.publicKey);
    }
    return dbKey;
  }

  /**
   * Checks the existence of the DB key path.
   * This checks if the file can be read and written.
   * If the file does not exist, this returns `false`.
   * If the file does exist but it cannot be read or written, then
   * this will throw `ErrorDBKeyRead`.
   */
  protected async existsDbKey(): Promise<boolean> {
    this.logger.info(`Checking ${this.dbKeyPath}`);
    try {
      await this.fs.promises.access(
        this.dbKeyPath,
        this.fs.constants.F_OK |
          this.fs.constants.R_OK |
          this.fs.constants.W_OK,
      );
    } catch (e) {
      if (e.code === 'ENOENT') {
        return false;
      }
      throw new keysErrors.ErrorDBKeyRead(e.message, { cause: e });
    }
    return true;
  }

  /**
   * Reads the DB key from the filesystem.
   * The DB key is expected to be stored in flattened JWE format.
   * The DB key is expected to be encrypted with our ECIES.
   */
  protected async readDbKey(
    keyPair: KeyPair,
    dbKeyPath: string = this.dbKeyPath
  ): Promise<BufferLocked<Key>> {
    let dbJWEJSON: string;
    try {
      dbJWEJSON = await this.fs.promises.readFile(dbKeyPath, 'utf-8');
    } catch (e) {
      throw new keysErrors.ErrorDBKeyRead(
        `DB key path ${dbKeyPath} cannot be read`,
        { cause: e }
      );
    }
    let dbJWE: any;
    try {
      dbJWE = JSON.parse(dbJWEJSON);
    } catch (e) {
      throw new keysErrors.ErrorDBKeyParse(
        `DB key path ${dbKeyPath} is not a valid JSON file`,
        { cause: e }
      );
    }
    const dbJWK = keysUtils.decapsulateWithPrivateKey(
      keyPair,
      dbJWE
    );
    if (dbJWK == null) {
      throw new keysErrors.ErrorDBKeyParse(
        `DB key path ${dbKeyPath} is not a valid encrypted JWK`
      );
    }
    const dbKey = keysUtils.keyFromJWK(dbJWK);
    if (dbKey == null) {
      throw new keysErrors.ErrorDBKeyParse(
        `DB key path ${dbKeyPath} is not a valid key`
      );
    }
    bufferLock(dbKey, this.strictMemoryLock);
    return dbKey;
  }

  /**
   * Writes the DB key from the filesystem.
   * The DB key will be stored in flattened JWE format.
   * The DB key will be encrypted with our ECIES.
   */
  protected async writeDbKey(
    dbKey: Key,
    publicKey: PublicKey,
  ): Promise<void> {
    const dbJWK = keysUtils.keyToJWK(dbKey);
    const dbJWE = keysUtils.encapsulateWithPublicKey(publicKey, dbJWK);
    const dbJWEJSON = JSON.stringify(dbJWE);
    try {
      // Write to temporary file first, then atomically rename
      await this.fs.promises.writeFile(`${this.dbKeyPath}.tmp`, dbJWEJSON, 'utf-8'),
      await this.fs.promises.rename(`${this.dbKeyPath}.tmp`, this.dbKeyPath);
    } catch (e) {
      throw new keysErrors.ErrorDBKeyWrite(
        `DB key path ${this.dbKeyPath} cannot be written to`,
        { cause: e }
      );
    }
  }

  /**
   * Generates the DB key.
   * This is 256 bit key.
   */
  protected generateDbKey(): BufferLocked<Key> {
    const key = keysUtils.generateKey();
    bufferLock(key, this.strictMemoryLock);
    return key;
  }

  /**
   * This sets up a password hash in-memory.
   * This is used to check if the password is correct.
   * The returned buffers are guaranteed to unpooled and memory-locked.
   * This means the underlying `ArrayBuffer` is safely transferrable.
   */
  protected async setupPasswordHash(
    password: string,
  ): Promise<[
    BufferLocked<PasswordHash>,
    BufferLocked<PasswordSalt>
  ]> {
    let hash: PasswordHash, salt: PasswordSalt;
    if (this.workerManager == null) {
      [hash, salt] = keysUtils.hashPassword(
        password,
        undefined,
        this.passwordOpsLimit,
        this.passwordMemLimit,
      );
    } else {
      [hash, salt] = await this.workerManager.call(async (w) => {
        const result = await w.hashPassword(
          password,
          undefined,
          this.passwordOpsLimit,
          this.passwordMemLimit,
        );
        result[0] = Buffer.from(result[0]);
        result[1] = Buffer.from(result[1]);
        return result as [PasswordHash, PasswordSalt];
      });
    }
    bufferLock(hash, this.strictMemoryLock);
    bufferLock(salt, this.strictMemoryLock);
    return [hash, salt];
  }
}

export default KeyRing;
