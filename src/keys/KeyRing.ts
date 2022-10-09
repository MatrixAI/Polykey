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
} from './types';
import type { NodeId } from '../ids/types';
import type { FileSystem } from '../types';
import path from 'path';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import * as keysUtils from './utils';
import * as keysErrors from './errors';
import { bufferLock, bufferUnlock } from './utils/memory';

interface KeyRing extends CreateDestroyStartStop {}
@CreateDestroyStartStop()
class KeyRing {
  public static async createKeyRing({
    keysPath,
    fs = require('fs'),
    logger = new Logger(this.name),
  }:
    | {
        keysPath: string;
        fs?: FileSystem;
        logger?: Logger;
      }
    | {
        keysPath: string;
        fs?: FileSystem;
        logger?: Logger;
      }) {
    logger.info(`Creating ${this.name}`);
    logger.info(`Setting keys path to ${keysPath}`);
    const keyRing = new this({
      keysPath,
      fs,
      logger,
    });
    logger.info(`Created ${this.name}`);
    return keyRing;
  }

  public readonly keysPath: string;
  public readonly publicKeyPath: string;
  public readonly privateKeyPath: string;
  public readonly dbKeyPath: string;

  protected fs: FileSystem;
  protected logger: Logger;
  protected _keyPair?: {
    publicKey: BufferLocked<PublicKey>;
    privateKey: BufferLocked<PrivateKey>;
    secretKey: BufferLocked<SecretKey>;
  };
  protected _dbKey?: BufferLocked<Key>;
  protected passwordHash?: Readonly<{
    hash: BufferLocked<PasswordHash>,
    salt: BufferLocked<PasswordSalt>
  }>;
  protected _recoveryCodeData?: RecoveryCodeLocked;

  public constructor({
    keysPath,
    fs,
    logger,
  }: {
    keysPath: string;
    fs: FileSystem;
    logger: Logger;
  }) {
    this.logger = logger;
    this.keysPath = keysPath;
    this.fs = fs;
    this.publicKeyPath = path.join(keysPath, 'public.jwk');
    this.privateKeyPath = path.join(keysPath, 'private.jwk');
    this.dbKeyPath = path.join(keysPath, 'db.jwk');
  }

  public async start(options: {
    password: string;
    fresh?: boolean
  } | {
    password: string;
    recoveryCode: RecoveryCode;
    fresh?: boolean
  } | {
    password: string;
    privateKey: PrivateKey;
    fresh?: boolean
  } | {
    password: string;
    privateKeyPath: string;
    fresh?: boolean
  }): Promise<void> {
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
    const [passwordHash, passwordSalt] = this.setupPasswordHash(options.password);
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
      bufferLock(recoveryCodeData);
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
    if (this._dbKey != null) {
      bufferUnlock(this._dbKey);
    }
    delete this._dbKey;
    if (this.passwordHash != null) {
      bufferUnlock(this.passwordHash.hash);
      bufferUnlock(this.passwordHash.salt);
    }
    delete this.passwordHash;
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.fs.promises.rm(this.keysPath, {
      force: true,
      recursive: true,
    });
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @ready(new keysErrors.ErrorKeyRingNotRunning())
  get keyPair(): KeyPair {
    return this._keyPair!;
  }

  @ready(new keysErrors.ErrorKeyRingNotRunning())
  get dbKey(): Key {
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
    return keysUtils.checkPassword(
      password,
      this.passwordHash!.hash,
      this.passwordHash!.salt
    );
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
    this.logger.info('Changing root key pair password');
    await this.writeKeyPair(this._keyPair!, password);
    const [passwordHash, passwordSalt] = this.setupPasswordHash(password);
    this.passwordHash = {
      hash: passwordHash,
      salt: passwordSalt
    };
    this.logger.info('Changed root key pair password');
  }

  /**
   * Rotates the key pair.
   * This generates a new recovery code and new key pair.
   * The DB key is not rotated, it is just re-encrypted with the new key pair.
   * The key pair is wrapped with the new password.
   */
  @ready(new keysErrors.ErrorKeyRingNotRunning())
  public async rotateKeyPair(password: string): Promise<void> {
    this.logger.info('Rotating root key pair');
    const recoveryCode = keysUtils.generateRecoveryCode(24);
    const keyPair = await this.generateKeyPair(recoveryCode);
    await Promise.all([
      this.writeKeyPair(keyPair, password),
      this.writeDbKey(this._dbKey!, keyPair.publicKey),
    ]);
    this._keyPair = keyPair as {
      publicKey: BufferLocked<PublicKey>;
      privateKey: BufferLocked<PrivateKey>;
      secretKey: BufferLocked<SecretKey>;
    };
    const recoveryCodeData = Buffer.from(recoveryCode, 'utf-8');
    bufferLock(recoveryCodeData);
    this._recoveryCodeData = recoveryCodeData as RecoveryCodeLocked;
    this.logger.info('Rotated root key pair');
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
  public async encrypt(
    receiverPublicKey: PublicKey,
    plainText: Buffer,
    authenticated: boolean = false
  ) {
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
  public sign(data: Buffer): Buffer {
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
      if ('recoveryCode' in options) {
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
      if ('recoveryCode' in options) {
        this.logger.info('Generating root key pair from recovery code');
        // Deterministic key pair generation from recovery code
        // Recovery code is new by virtue of generating key pair
        recoveryCodeNew = options.recoveryCode;
        rootKeyPair = await this.generateKeyPair(options.recoveryCode);
        await this.writeKeyPair(rootKeyPair, options.password);
        return [rootKeyPair, recoveryCodeNew];
      } else if ('privateKey' in options) {
        this.logger.info('Making root key pair from provided private key');
        const privateKey = options.privateKey;
        const publicKey = keysUtils.publicKeyFromPrivateKeyEd25519(privateKey);
        const keyPair = keysUtils.makeKeyPair(publicKey, privateKey);
        bufferLock(keyPair.publicKey);
        bufferLock(keyPair.privateKey);
        bufferLock(keyPair.secretKey);
        rootKeyPair = keyPair as KeyPairLocked;
        await this.writeKeyPair(rootKeyPair, options.password);
        return [rootKeyPair, undefined];
      } else if ('privateKeyPath' in options) {
        this.logger.info('Making root key pair from provided private key path');
        const privateKey = await this.readPrivateKey(
          options.password,
          options.privateKeyPath
        );
        const publicKey = keysUtils.publicKeyFromPrivateKeyEd25519(privateKey);
        const keyPair = keysUtils.makeKeyPair(publicKey, privateKey);
        bufferLock(keyPair.publicKey);
        bufferLock(keyPair.privateKey);
        bufferLock(keyPair.secretKey);
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
      throw new keysErrors.ErrorRootKeysRead(
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
      throw new keysErrors.ErrorRootKeysRead(e.message, { cause: e });
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
      throw new keysErrors.ErrorRootKeysRead(e.message, { cause: e });
    }
    return true;
  }

  /**
   * Reads the key pair from the filesystem.
   * This only needs to read the private key as the public key is derived.
   * The private key is expected to be stored in a flattened JWE format.
   * The private key is expected to be encrypted with `PBES2-HS512+A256KW`.
   * See: https://www.rfc-editor.org/rfc/rfc7518#section-4.8
   */
  protected async readKeyPair(password: string): Promise<KeyPairLocked> {
    const privateKey = await this.readPrivateKey(password);
    const publicKey = keysUtils.publicKeyFromPrivateKeyEd25519(
      privateKey,
    );
    const keyPair = keysUtils.makeKeyPair(publicKey, privateKey);
    // Private key is already locked
    bufferLock(keyPair.publicKey);
    bufferLock(keyPair.secretKey);
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
        'utf8',
      );
    } catch (e) {
      throw new keysErrors.ErrorRootKeysRead(
        `Public key path ${publicKeyPath} cannot be read`,
        { cause: e }
      );
    }
    let publicJWK: any;
    try {
      publicJWK = JSON.parse(publicJWKJSON);
    } catch (e) {
      throw new keysErrors.ErrorRootKeysParse(
        `Public key path ${publicKeyPath} is not a valid JSON file`,
        { cause: e }
      );
    }
    const publicKey = keysUtils.publicKeyFromJWK(publicJWK);
    if (publicKey == null) {
      throw new keysErrors.ErrorRootKeysParse(
        `Public key path ${publicKeyPath} is not a valid public key`
      );
    }
    bufferLock(publicKey);
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
    let privateJWEJSON: string;
    try {
      privateJWEJSON = await this.fs.promises.readFile(
        privateKeyPath,
        'utf-8',
      );
    } catch (e) {
      throw new keysErrors.ErrorRootKeysRead(
        `Private key path ${privateKeyPath} cannot be read`,
        { cause: e }
      );
    }
    let privateJWE: any;
    try {
      privateJWE = JSON.parse(privateJWEJSON);
    } catch (e) {
      throw new keysErrors.ErrorRootKeysParse(
        `Private key path ${privateKeyPath} is not a valid JSON file`,
        { cause: e }
      );
    }
    const privateJWK = keysUtils.unwrapWithPassword(
      password,
      privateJWE
    );
    if (privateJWK == null) {
      throw new keysErrors.ErrorRootKeysParse(
        `Private key path ${privateKeyPath} is not a valid encrypted JWK`
      );
    }
    const privateKey = keysUtils.privateKeyFromJWK(privateJWK);
    if (privateKey == null) {
      throw new keysErrors.ErrorRootKeysParse(
        `Private key path ${privateKeyPath} is not a valid private key`
      );
    }
    bufferLock(privateKey);
    return privateKey;
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
    const privateJWE = keysUtils.wrapWithPassword(password, privateJWK);
    const privateJWEJSON = JSON.stringify(privateJWE);
    try {
      await Promise.all([
        this.fs.promises.writeFile(`${this.publicKeyPath}.tmp`, publicJWKJSON),
        this.fs.promises.writeFile(
          `${this.privateKeyPath}.tmp`,
          privateJWEJSON,
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
      throw new keysErrors.ErrorRootKeysWrite(
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
      keyPair = await keysUtils.generateDeterministicKeyPair(recoveryCode);
    } else {
      keyPair = keysUtils.generateKeyPair();
    }
    bufferLock(keyPair.publicKey);
    bufferLock(keyPair.privateKey);
    bufferLock(keyPair.secretKey);
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
  protected async setupDbKey(rootKeyPair: KeyPair): Promise<BufferLocked<Key>> {
    let dbKey: BufferLocked<Key>;
    if (await this.existsDbKey()) {
      dbKey = await this.readDbKey(rootKeyPair);
    } else {
      this.logger.info('Generating db key');
      dbKey = this.generateDbKey();
      await this.writeDbKey(dbKey, rootKeyPair.publicKey);
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
    bufferLock(dbKey);
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
    dbKeyPath: string = this.dbKeyPath
  ): Promise<void> {
    const dbJWK = keysUtils.keyToJWK(dbKey);
    const dbJWE = keysUtils.encapsulateWithPublicKey(publicKey, dbJWK);
    const dbJWEJSON = JSON.stringify(dbJWE);
    try {
      await this.fs.promises.writeFile(`${dbKeyPath}`, dbJWEJSON);
    } catch (e) {
      throw new keysErrors.ErrorDBKeyWrite(
        `DB key path ${dbKeyPath} cannot be written to`,
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
    bufferLock(key);
    return key;
  }

  /**
   * This sets up a password hash in-memory.
   * This is used to check if the password is correct.
   */
  protected setupPasswordHash(password: string): [
    BufferLocked<PasswordHash>,
    BufferLocked<PasswordSalt>
  ] {
    const [hash, salt] = keysUtils.hashPassword(password);
    bufferLock(hash);
    bufferLock(salt);
    return [hash, salt];
  }
}

export default KeyRing;
