import type {
  Key,
  KeyPair,
  PublicKey,
  PrivateKey,
  RecoveryCode,
  JWK,
  JWKEncrypted,
} from './types';
import type { NodeId } from '../ids/types';
import type { FileSystem } from '../types';
import path from 'path';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import * as keysUtils from './utils/index';
import * as keysErrors from './errors';
import * as utils from '../utils';

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
  protected _keyPair?: KeyPair;
  protected _recoveryCode?: RecoveryCode;
  protected _dbKey?: Key;

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
    this._keyPair = keyPair;
    this._recoveryCode = recoveryCode;
    this._dbKey = dbKey;
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    delete this._keyPair;
    delete this._recoveryCode;
    delete this._dbKey;
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
    return this._recoveryCode;
  }

  @ready(new keysErrors.ErrorKeyRingNotRunning())
  public getNodeId(): NodeId {
    return keysUtils.publicKeyToNodeId(this._keyPair!.publicKey);
  }

  @ready(new keysErrors.ErrorKeyRingNotRunning())
  public async checkPassword(password: string): Promise<boolean> {
    try {
      await this.readPrivateKey(password);
    } catch {
      return false;
    }
    return true;
  }

  @ready(new keysErrors.ErrorKeyRingNotRunning())
  public async changePassword(password: string): Promise<void> {
    this.logger.info('Changing root key pair password');
    return this.writeKeyPair(this._keyPair!, password);
  }

  @ready(new keysErrors.ErrorKeyRingNotRunning())
  public async rotateKeyPair() {
    // Reset does a clean reset of the root cert chain
    // this from the keyring perspective doesn't change anything
    // the KeyManager doesn't depend on this
    // this is UI driven?
    // so in a way, we rotating the key pair by creating a new one
  }

  /**
   * Encrypt to a public key.
   * Note this does not automatically allow the receiver to authenticate the
   * sender. To do so, you should add a signature into the plain text to perform
   * `sign-then-encrypt`.
   * Alternatives include:
   *   - `encrypt-then-sign`
   *   - Public Key Authenticated Encryption (PKAE) (ECDH-1PU)
   *   - Signcryption
   * TODO: add support for PKAE.
   */
  @ready(new keysErrors.ErrorKeyRingNotRunning())
  public async encrypt(
    receiverPublicKey: BufferSource | CryptoKey,
    plainText: BufferSource,
  ) {
    return keysUtils.encryptWithPublicKey(receiverPublicKey, plainText);
  }

  /**
   * Decrypt data sent to this key pair
   * Note that this does not automatically authenticate the sender.
   */
  @ready(new keysErrors.ErrorKeyRingNotRunning())
  public async decrypt(cipherText: BufferSource): Promise<Buffer | undefined> {
    return keysUtils.decryptWithPrivateKey(
      this._keyPair!.privateKey,
      cipherText,
    );
  }

  @ready(new keysErrors.ErrorKeyRingNotRunning())
  public async sign(data: BufferSource): Promise<Buffer> {
    return keysUtils.signWithPrivateKey(this._keyPair!.privateKey, data);
  }

  @ready(new keysErrors.ErrorKeyRingNotRunning())
  public async verify(
    publicKey: PublicKey,
    data: BufferSource,
    signature: BufferSource,
  ): Promise<boolean> {
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
  }): Promise<[KeyPair, RecoveryCode | undefined]> {
    let rootKeyPair: KeyPair;
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
        rootKeyPair = keysUtils.makeKeyPair(publicKey, privateKey);
        await this.writeKeyPair(rootKeyPair, options.password);
        return [rootKeyPair, undefined];
      } else if ('privateKeyPath' in options) {
        this.logger.info('Making root key pair from provided private key path');
        const privateKey = await this.readPrivateKey(
          options.password,
          options.privateKeyPath
        );
        const publicKey = keysUtils.publicKeyFromPrivateKeyEd25519(privateKey);
        rootKeyPair = keysUtils.makeKeyPair(publicKey, privateKey);
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
  protected async readKeyPair(password: string): Promise<KeyPair> {
    const privateKey = await this.readPrivateKey(password);
    const publicKey = await keysUtils.publicKeyFromPrivateKeyEd25519(
      privateKey,
    );
    return {
      publicKey,
      privateKey,
    } as KeyPair;
  }

  /**
   * Reads the public key from the filesystem.
   * The public key is expected to be stored in a flattened JWE format.
   */
  protected async readPublicKey(): Promise<PublicKey> {
    let publicJWKJSON: string;
    try {
      publicJWKJSON = await this.fs.promises.readFile(
        this.publicKeyPath,
        'utf8',
      );
    } catch (e) {
      throw new keysErrors.ErrorRootKeysRead(e.message, { cause: e });
    }
    let publicJWK: JWK;
    try {
      publicJWK = JSON.parse(publicJWKJSON);
    } catch (e) {
      throw new keysErrors.ErrorRootKeysParse(e.message, { cause: e });
    }
    const publicKey = await keysUtils.publicKeyFromJWK(publicJWK);
    if (publicKey == null) {
      throw new keysErrors.ErrorRootKeysParse();
    }
    return publicKey;
  }

  /**
   * Reads the private key from the filesystem.
   * The private key is expected to be stored in a flattened JWE format.
   * The private key is expected to be encrypted with `PBES2-HS512+A256KW`.
   * See: https://www.rfc-editor.org/rfc/rfc7518#section-4.8
   */
  protected async readPrivateKey(
    password: string,
    privateKeyPath: string = this.privateKeyPath,
  ): Promise<PrivateKey> {

    // the private key path can be overwritten...


    let privateJWEJSON: string;
    try {
      privateJWEJSON = await this.fs.promises.readFile(
        this.privateKeyPath,
        'utf-8',
      );
    } catch (e) {
      throw new keysErrors.ErrorRootKeysRead(e.message, { cause: e });
    }
    let privateJWE: JWEFlattened;
    try {
      privateJWE = JSON.parse(privateJWEJSON);
    } catch (e) {
      throw new keysErrors.ErrorRootKeysParse(e.message, { cause: e });
    }
    const privateJWK = await keysUtils.unwrapWithPassword(password, privateJWE);
    if (privateJWK == null) {
      throw new keysErrors.ErrorRootKeysParse();
    }
    const privateKey = await keysUtils.privateKeyFromJWK(privateJWK);
    if (privateKey == null) {
      throw new keysErrors.ErrorRootKeysParse();
    }
    return privateKey;
  }

  /**
   * Writes the root key pair to the filesystem.
   * The public key will be stored in JWK format.
   * The private key will be stored in flattened JWE format.
   * The private key will be encrypted with `PBES2-HS512+A256KW`.
   */
  protected async writeKeyPair(
    keyPair: KeyPair,
    password: string,
  ): Promise<void> {
    const publicJWK = await keysUtils.publicKeyToJWK(keyPair.publicKey);
    const privateJWK = await keysUtils.privateKeyToJWK(keyPair.privateKey);
    const publicJWKJSON = JSON.stringify(publicJWK);
    const privateJWE = await keysUtils.wrapWithPassword(password, privateJWK);
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
      throw new keysErrors.ErrorRootKeysWrite(e.message, { cause: e });
    }
  }

  /**
   * Generates the root key pair.
   * If recovery code is passed in, it is used as a deterministic seed.
   */
  protected async generateKeyPair(
    recoveryCode?: RecoveryCode,
  ): Promise<KeyPair> {
    let keyPair: KeyPair;
    if (recoveryCode != null) {
      keyPair = await keysUtils.generateDeterministicKeyPair(recoveryCode);
    } else {
      keyPair = await keysUtils.generateKeyPair();
    }
    return keyPair;
  }

  protected async recoverKeyPair(
    recoveryCode: RecoveryCode,
  ): Promise<KeyPair | undefined> {
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
        await this.readDbKey(recoveredKeyPair.privateKey);
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
  protected async setupDbKey(rootKeyPair: KeyPair): Promise<Key> {
    let dbKey: Key;
    // This is always a 256 bit key
    if (await this.existsDbKey()) {
      dbKey = await this.readDbKey(rootKeyPair.privateKey);
    } else {
      this.logger.info('Generating db key');
      dbKey = await this.generateDbKey();
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
  protected async readDbKey(privateKey: PrivateKey): Promise<Key> {
    let dbJWEJSON: string;
    try {
      dbJWEJSON = await this.fs.promises.readFile(this.dbKeyPath, 'utf-8');
    } catch (e) {
      throw new keysErrors.ErrorDBKeyRead(e.message, { cause: e });
    }
    let dbJWE: JWEFlattened;
    try {
      dbJWE = JSON.parse(dbJWEJSON);
    } catch (e) {
      throw new keysErrors.ErrorDBKeyParse(e.message, { cause: e });
    }
    const dbJWK = await keysUtils.decapsulateWithPrivateKey(privateKey, dbJWE);
    if (dbJWK == null) {
      throw new keysErrors.ErrorRootKeysParse();
    }
    const dbKey = await keysUtils.keyFromJWK(dbJWK);
    if (dbKey == null) {
      throw new keysErrors.ErrorRootKeysParse();
    }
    return dbKey;
  }

  /**
   * Writes the DB key from the filesystem.
   * The DB key will be stored in flattened JWE format.
   * The DB key will be encrypted with our ECIES.
   */
  protected async writeDbKey(dbKey: Key, publicKey: PublicKey): Promise<void> {
    const dbJWK = await keysUtils.keyToJWK(dbKey);
    const dbJWE = await keysUtils.encapsulateWithPublicKey(publicKey, dbJWK);
    const dbJWEJSON = JSON.stringify(dbJWE);
    try {
      await this.fs.promises.writeFile(`${this.dbKeyPath}`, dbJWEJSON);
    } catch (e) {
      throw new keysErrors.ErrorDBKeyWrite(e.message, { cause: e });
    }
  }

  /**
   * Generates the DB key.
   * This is 256 bit key.
   * It will be used for AES-256-GCM symmetric encryption/decryption.
   */
  protected async generateDbKey(): Promise<Key> {
    return await keysUtils.generateKey();
  }
}

// Make it an observable
// so you can "subscribe" to this data
// BehaviourObservable? BehaviourSubject

export default KeyRing;
