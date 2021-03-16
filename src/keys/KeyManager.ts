import os from 'os';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as bip39 from 'bip39';
import { promisify } from 'util';
import { pki, md } from 'node-forge';
import { VirtualFS } from 'virtualfs';
import { EncryptedFS } from 'encryptedfs';
import { Pool, ModuleThread } from 'threads';
import randomBytes from 'secure-random-bytes';
import { KeyManagerWorker } from '../keys/KeyManagerWorker';
import Logger from '@matrixai/logger';

type KeyManagerMetadata = {
  privateKeyPath: string | null;
  publicKeyPath: string | null;
};

type KeyPair = {
  publicKey?: pki.rsa.PublicKey;
  privateKey?: pki.rsa.PrivateKey;
  // This encryptedPrivateKey is used as an intermediary step
  // so the keypair can be loaded and unlocked at different intervals
  encryptedPrivateKey?: string;
};

type ReencryptHandler = (
  decryptOld: (data: Buffer) => Promise<Buffer>,
  encryptNew: (data: Buffer) => Promise<Buffer>,
) => Promise<void>;

class KeyManager {
  private primaryKeyPair: KeyPair = {};
  // eslint-disable-next-line no-undef
  private unlockedTimeout?: NodeJS.Timeout;
  private derivedKeys: Map<string, Buffer>;
  private derivedKeysPath: string;
  private useWebWorkers: boolean;
  private workerPool?: Pool<ModuleThread<KeyManagerWorker>>;
  private logger: Logger;

  polykeyPath: string;
  private fileSystem: typeof fs;

  // mnemonic data
  private mnemonicStore: string;
  private get mnemonic(): string {
    return this.mnemonicStore;
  }
  private set mnemonic(mnemonic: string) {
    this.mnemonicStore = mnemonic;
    const vfsInstance = new VirtualFS();
    this.mnemonicEfs = new EncryptedFS(
      mnemonic,
      vfsInstance,
      vfsInstance,
      fs,
      process,
    );
  }
  private mnemonicFilePath: string;
  private mnemonicEfs: EncryptedFS;

  private keypairPath: string;
  private metadataPath: string;
  private metadata: KeyManagerMetadata = {
    privateKeyPath: null,
    publicKeyPath: null,
  };

  private reencryptHandlers: ReencryptHandler[] = [];
  addReencryptHandler(handler: ReencryptHandler) {
    this.reencryptHandlers.push(handler);
  }

  constructor(
    polykeyPath = `${os.homedir()}/polykey`,
    fileSystem: typeof fs,
    logger: Logger,
    useWebWorkers = false,
    workerPool?: Pool<ModuleThread<KeyManagerWorker>>,
  ) {
    this.useWebWorkers = useWebWorkers;
    this.workerPool = workerPool;
    this.derivedKeys = new Map();
    this.fileSystem = fileSystem;
    this.logger = logger;

    // Load key manager metadata
    this.polykeyPath = polykeyPath;
    this.keypairPath = path.join(polykeyPath, '.keys');
    if (!this.fileSystem.existsSync(this.keypairPath)) {
      this.fileSystem.mkdirSync(this.keypairPath, { recursive: true });
    }
    this.metadataPath = path.join(this.keypairPath, 'metadata');
    this.mnemonicFilePath = path.join(this.keypairPath, 'mnemonic');
    this.derivedKeysPath = path.join(this.keypairPath, 'derived-keys');
    this.loadMetadata();

    // Load keys if they were provided
    if (this.metadata.privateKeyPath && this.metadata.publicKeyPath) {
      // Load files into memory
      this.loadKeyPair(
        this.metadata.publicKeyPath,
        this.metadata.privateKeyPath,
      );
    }
  }

  public get Status() {
    return {
      keypairUnlocked: this.KeypairUnlocked,
      keypairLoaded: this.KeypairUnlocked,
    };
  }

  public get KeypairUnlocked(): boolean {
    return this.primaryKeyPair.privateKey ? true : false;
  }

  /**
   * Generates a new assymetric key pair (publicKey and privateKey).
   * @param name Name of keypair owner
   * @param email Email of keypair owner
   * @param passphrase Passphrase to lock the keypair
   * @param nbits Size of the new keypair
   * @param replacePrimary If true, the generated keypair becomes the new primary identity of the key manager
   * @param progressCallback A progress hook for keypair generation
   */
  async generateKeyPair(
    passphrase: string,
    nbits: number = 4096,
    replacePrimary = false,
  ): Promise<{ publicKey: string; privateKey: string }> {
    const keypair = await promisify(pki.rsa.generateKeyPair)({ bits: nbits });

    // encrypt private key using sensible defaults
    const encodedPublicKey = pki.publicKeyToPem(keypair.publicKey);
    const encodedPrivateKey = pki.encryptRsaPrivateKey(
      keypair.privateKey,
      passphrase,
    );

    // Resolve to parent promise
    if (replacePrimary) {
      // reencrypt data
      for (const handler of this.reencryptHandlers) {
        await handler(this.decryptData.bind(this), this.encryptData.bind(this));
      }
      // Set the new keypair
      this.primaryKeyPair = {
        publicKey: keypair.publicKey,
        privateKey: keypair.privateKey,
      };
      // Overwrite in memory
      const publicKeyPath = path.join(this.keypairPath, 'public_key');
      const privateKeyPath = path.join(this.keypairPath, 'private_key');
      await this.fileSystem.promises.writeFile(publicKeyPath, encodedPublicKey);
      await this.fileSystem.promises.writeFile(
        privateKeyPath,
        encodedPrivateKey,
      );
      // Set metadata
      this.metadata.publicKeyPath = publicKeyPath;
      this.metadata.privateKeyPath = privateKeyPath;
      // create a new mnemonic as a backup
      this.mnemonic = bip39.generateMnemonic();

      // write metadata
      await this.writeMetadata();
    }
    return {
      publicKey: encodedPublicKey,
      privateKey: encodedPrivateKey,
    };
  }

  /**
   * This method allows the user to recover the contents of the keynode in the case of a forgotten passphrase
   * It will also create a new keypair protected with the newPassphrase
   * @param mnemonic The backup word sequence
   * @param userId The user id of the newly created keypair
   * @param passphrase The new passphrase with which to protect the new
   */
  async recoverKeynode(
    mnemonic: string,
    userId: string,
    passphrase: string,
  ): Promise<void> {
    // set mnemonic
    this.mnemonic = mnemonic;
    // decrypt the data with mnemonic
    const vaultKeysPath = path.join(this.polykeyPath, '.vaultKeysBackup');
    const vaultKeys = await this.readFileWithMnemonic(vaultKeysPath);
    // replace primary keypair
    await this.generateKeyPair(passphrase, undefined, true);
    // reencrypt data with newly generated keypair
    const encryptedVaultKeys = this.encryptData(vaultKeys.toString());
    // write encrypted data to file
    await this.fileSystem.promises.writeFile(vaultKeysPath, encryptedVaultKeys);
  }

  /**
   * Allows the user to verify the mnemonic they created along with the primary keypair
   * @param mnemonic The mnemonic to be verified
   */
  async verifyMnemonic(mnemonic: string): Promise<boolean> {
    return mnemonic == this.mnemonic;
  }

  /**
   * Get the primary keypair
   */
  getKeyPair(): KeyPair {
    return this.primaryKeyPair;
  }

  /**
   * Get the public key of the primary keypair
   */
  getPublicKey(): pki.rsa.PublicKey {
    if (!this.primaryKeyPair.publicKey) {
      throw Error('public key is not loaded yet');
    }
    return this.primaryKeyPair.publicKey;
  }

  /**
   * Get the public key of the primary keypair
   */
  getPublicKeyString(): string {
    return pki.publicKeyToPem(this.getPublicKey());
  }

  /**
   * Get the private key of the primary keypair
   */
  getPrivateKey(): pki.rsa.PrivateKey {
    if (!this.primaryKeyPair.privateKey) {
      throw Error('private key is not loaded yet');
    }
    return this.primaryKeyPair.privateKey;
  }

  /**
   * Get the private key of the primary keypair
   */
  getPrivateKeyString(): string {
    // this is used for symmetric key derivation and is the unlocked keypair string
    // i.e. not protected by any passphrase so it is secure to use as a seed for pbkdf2
    return pki.privateKeyToPem(this.getPrivateKey());
  }

  /**
   * Loads the keypair into the key manager as the primary identity
   * @param publicKey Public Key. A string is treated as a system file path and a buffer is treated as containing the key.
   * @param privateKey Private Key. A string is treated as a system file path and a buffer is treated as containing the key.
   */
  loadKeyPair(publicKey: string | Buffer, privateKey: string | Buffer): void {
    this.loadPrivateKey(privateKey);
    this.loadPublicKey(publicKey);
  }

  /**
   * Loads the private key into the primary keypair
   * @param privateKey Private Key. A string is treated as a system file path and a buffer is treated as containing the key.
   */
  loadPrivateKey(privateKey: string | Buffer): void {
    let keyBuffer: Buffer;
    if (typeof privateKey === 'string') {
      keyBuffer = this.fileSystem.readFileSync(privateKey);
      this.metadata.privateKeyPath = privateKey;
      this.writeMetadata();
    } else {
      keyBuffer = privateKey;
    }
    this.primaryKeyPair.encryptedPrivateKey = keyBuffer.toString();
  }

  /**
   * Loads the public key into the primary keypair
   * @param publicKey Public Key. A string is treated as a system file path and a buffer is treated as containing the key.
   */
  loadPublicKey(publicKey: string | Buffer): void {
    let keyBuffer: Buffer;
    if (typeof publicKey === 'string') {
      keyBuffer = this.fileSystem.readFileSync(publicKey);
      this.metadata.publicKeyPath = publicKey;
      this.writeMetadata();
    } else {
      keyBuffer = publicKey;
    }
    this.primaryKeyPair.publicKey = pki.publicKeyFromPem(keyBuffer.toString());
  }

  /**
   * Loads the primary identity into the key manager from the existing keypair
   * @param passphrase Passphrase to unlock the private key
   * @param timeout Minutes of inactivity after which identity is locked again
   */
  async unlockKeypair(passphrase: string, timeout = 15): Promise<void> {
    // check if already unlocked
    if (this.unlockedTimeout && this.primaryKeyPair.privateKey) {
      clearTimeout(this.unlockedTimeout);
    } else {
      const encryptedPrivateKey = this.primaryKeyPair.encryptedPrivateKey;
      if (!encryptedPrivateKey) {
        // Load keys if they were provided
        if (this.metadata.privateKeyPath && this.metadata.publicKeyPath) {
          // Load files into memory
          this.loadKeyPair(
            this.metadata.publicKeyPath,
            this.metadata.privateKeyPath,
          );
        } else {
          throw Error('keypair path is not defined');
        }
      }
      this.primaryKeyPair.privateKey = pki.decryptRsaPrivateKey(
        encryptedPrivateKey!,
        passphrase,
      ) as pki.rsa.PrivateKey;
    }

    // set a new timeout
    if (timeout !== 0) {
      // set new timeout
      this.unlockedTimeout = setTimeout(() => {
        this.lockIdentity();
      }, timeout * 60 * 1000);
    }
  }

  refreshTimeout(timeout = 15) {
    if (!this.unlockedTimeout) {
      if (!this.primaryKeyPair.privateKey) {
        return;
      }
    } else {
      clearTimeout(this.unlockedTimeout);
    }
    if (this.unlockedTimeout) {
      this.unlockedTimeout = this.unlockedTimeout.refresh();
    } else {
      // set new timeout
      this.unlockedTimeout = setTimeout(() => {
        this.lockIdentity();
      }, timeout * 60 * 1000);
    }
  }

  /**
   * Locks the primary identity
   */
  lockIdentity(): void {
    this.primaryKeyPair.privateKey = undefined;
  }

  /**
   * [WARNING] Export the un-encrypted primary private key to a specified location
   * @param path Destination path
   */
  exportPrivateKey(path: string): void {
    // WARNING: note this is the unencrypted private key
    this.fileSystem.writeFileSync(path, this.getPrivateKeyString());
    this.metadata.privateKeyPath = path;
    this.writeMetadata();
  }

  /**
   * Export the primary public key to a specified location
   * @param path Destination path
   */
  exportPublicKey(path: string): void {
    this.fileSystem.writeFileSync(path, this.getPublicKeyString());
    this.metadata.publicKeyPath = path;
    this.writeMetadata();
  }

  /**
   * Asynchronously Generates a new symmetric key and stores it in the key manager
   * @param name Unique name of the generated key
   * @param passphrase Passphrase to derive the key from
   * @param storeKey Whether to store the key in the key manager
   */
  async generateKey(
    name: string,
    passphrase: string,
    storeKey = true,
  ): Promise<Buffer> {
    const salt = randomBytes(32);
    const key = await promisify(crypto.pbkdf2)(
      passphrase,
      salt,
      10000,
      256 / 8,
      'sha256',
    );
    if (storeKey) {
      this.derivedKeys[name] = key;
      await this.writeMetadata();
    }
    return key;
  }

  /**
   * Synchronously Generates a new symmetric key and stores it in the key manager
   * @param name Unique name of the generated key
   * @param passphrase Passphrase to derive the key from
   * @param storeKey Whether to store the key in the key manager
   */
  generateKeySync(name: string, passphrase: string, storeKey = true): Buffer {
    const salt = randomBytes(32);
    const key = crypto.pbkdf2Sync(passphrase, salt, 10000, 256 / 8, 'sha256');
    if (storeKey) {
      this.derivedKeys[name] = key;
      this.writeMetadata();
    }
    return key;
  }

  /**
   * Deletes a derived symmetric key from the key manager
   * @param name Name of the key to be deleted
   */
  async deleteKey(name: string): Promise<boolean> {
    const successful = delete this.derivedKeys[name];
    await this.writeMetadata();
    return successful;
  }

  /**
   * List all keys in the current keymanager
   */
  listKeys(): string[] {
    return Object.keys(this.derivedKeys);
  }

  /**
   * Synchronously imports an existing key from file or Buffer
   * @param name Unique name of the imported key
   * @param key Key to be imported
   */
  importKeySync(name: string, key: string | Buffer): void {
    if (typeof key === 'string') {
      this.derivedKeys[name] = this.fileSystem.readFileSync(key);
    } else {
      this.derivedKeys[name] = key;
    }
  }

  /**
   * Asynchronously imports an existing key from file or Buffer
   * @param name Unique name of the imported key
   * @param key Key to be imported
   */
  async importKey(name: string, key: string | Buffer): Promise<void> {
    if (typeof key === 'string') {
      this.derivedKeys[name] = await this.fileSystem.promises.readFile(key);
    } else {
      this.derivedKeys[name] = key;
    }
  }

  /**
   * Synchronously exports an existing key from file or Buffer
   * @param name Name of the key to be exported
   * @param dest Destination path
   * @param createPath If set to true, the path is recursively created
   */
  exportKeySync(name: string, dest: string, createPath?: boolean): void {
    if (!this.derivedKeys.has(name)) {
      throw Error(`There is no key loaded for name: ${name}`);
    }
    if (createPath) {
      this.fileSystem.mkdirSync(path.dirname(dest), { recursive: true });
    }
    this.fileSystem.writeFileSync(dest, this.derivedKeys[name]);
  }

  /**
   * Asynchronously exports an existing key from file or Buffer
   * @param name Name of the key to be exported
   * @param dest Destination path
   * @param createPath If set to true, the path is recursively created
   */
  async exportKey(
    name: string,
    dest: string,
    createPath?: boolean,
  ): Promise<void> {
    if (!this.derivedKeys.has(name)) {
      throw Error(`There is no key loaded for name: ${name}`);
    }
    if (createPath) {
      await this.fileSystem.promises.mkdir(path.dirname(dest), {
        recursive: true,
      });
    }
    await this.fileSystem.promises.writeFile(dest, this.derivedKeys[name]);
  }

  /**
   * Signs the given data with the provided key or the primary key if none is specified
   * @param data the data to be signed
   * @param privateKey the key to sign with. Defaults to primary private key if no key is given.
   * @param passphrase Required if privateKey is provided.
   */
  async signData(
    data: string,
    privateKey?: string,
    passphrase?: string,
  ): Promise<string> {
    let resolvedKey: pki.rsa.PrivateKey;
    if (privateKey) {
      if (!passphrase) {
        throw Error('passphrase for private key was not provided');
      }
      resolvedKey = pki.decryptRsaPrivateKey(
        privateKey.toString(),
        passphrase,
      ) as pki.rsa.PrivateKey;
    } else if (this.primaryKeyPair.privateKey) {
      resolvedKey = this.primaryKeyPair.privateKey;
    } else {
      throw Error('key pair is not loaded');
    }

    if (this.useWebWorkers && this.workerPool) {
      const workerResponse = await this.workerPool.queue(
        async (workerCrypto) => {
          return await workerCrypto.signData(
            data,
            pki.privateKeyToPem(resolvedKey),
          );
        },
      );
      return workerResponse;
    } else {
      const digest = md.sha512.create();
      digest.update(data.toString(), 'raw');
      const signature = resolvedKey.sign(digest);
      return signature;
    }
  }

  /**
   * Signs the given file with the provided key or the primary key if none is specified
   * @param filePath Path to file containing the data to be signed
   * @param privateKey The key to sign with. Defaults to primary public key if no key is given.
   * @param passphrase Required if privateKey is provided.
   */
  async signFile(
    filePath: string,
    privateKey?: string | Buffer,
    passphrase?: string,
  ): Promise<string> {
    // Get key if provided
    let keyBuffer: Buffer | undefined;
    if (privateKey) {
      if (typeof privateKey === 'string') {
        // Path
        // Read in from fs
        keyBuffer = this.fileSystem.readFileSync(privateKey);
      } else {
        // Buffer
        keyBuffer = privateKey;
      }
    }
    // Read file into buffer
    const buffer = this.fileSystem.readFileSync(filePath);
    // Sign the buffer
    const signature = await this.signData(
      buffer.toString(),
      keyBuffer?.toString() ?? undefined,
      passphrase,
    );
    // Write buffer to signed file
    const signedPath = `${filePath}.sig`;
    this.fileSystem.writeFileSync(signedPath, signature);
    return signedPath;
  }

  /**
   * Verifies the given data with the provided key or the primary key if none is specified
   * @param data the data to be verified
   * @param signature the signature
   * @param publicKey Buffer containing the key to verify with. Defaults to primary public key if no key is given.
   */
  async verifyData(
    data: string,
    signature: string,
    publicKey?: string,
  ): Promise<boolean> {
    let resolvedKey: pki.rsa.PublicKey;
    if (publicKey) {
      resolvedKey = pki.publicKeyFromPem(publicKey);
    } else if (this.primaryKeyPair.publicKey) {
      resolvedKey = this.primaryKeyPair.publicKey;
    } else {
      throw Error('key pair is not loaded');
    }

    if (this.useWebWorkers && this.workerPool) {
      const workerResponse = await this.workerPool.queue(
        async (workerCrypto) => {
          return await workerCrypto.verifyData(
            data,
            signature,
            pki.publicKeyToPem(resolvedKey),
          );
        },
      );
      return workerResponse;
    } else {
      const digest = md.sha512.create();
      digest.update(data.toString(), 'raw');
      const verified = resolvedKey.verify(digest.digest().bytes(), signature);
      return verified;
    }
  }

  /**
   * Verifies the given file with the provided key or the primary key if none is specified
   * @param filePath Path to file containing the data to be verified
   * @param publicKey Buffer containing the key to verify with. Defaults to primary public key if no key is given.
   */
  async verifyFile(
    filePath: string,
    signature: string | Buffer,
    publicKey?: string | Buffer,
  ): Promise<boolean> {
    // Get key if provided
    let keyBuffer: Buffer | undefined;
    if (publicKey) {
      if (typeof publicKey === 'string') {
        // Read in from fs
        keyBuffer = this.fileSystem.readFileSync(publicKey);
      } else {
        // Buffer
        keyBuffer = publicKey;
      }
    }
    // get signature
    let signatureBuffer: Buffer;
    if (typeof signature === 'string') {
      // Path
      // Read in from fs
      signatureBuffer = this.fileSystem.readFileSync(signature);
    } else {
      // Buffer
      signatureBuffer = signature;
    }
    // Read in file buffer and signature
    const fileData = this.fileSystem.readFileSync(filePath);
    const verifiedMessage = await this.verifyData(
      fileData.toString(),
      signatureBuffer.toString(),
      keyBuffer?.toString(),
    );
    this.fileSystem.writeFileSync(filePath, verifiedMessage);

    return true;
  }

  /**
   * Encrypts the given data for a specific public key
   * @param data The data to be encrypted
   * @param publicKey The key to encrypt for (optional)
   */
  async encryptData(data: string, publicKey?: string): Promise<string> {
    let resolvedKey: pki.rsa.PublicKey;
    if (publicKey) {
      resolvedKey = pki.publicKeyFromPem(publicKey);
    } else if (this.primaryKeyPair.publicKey) {
      resolvedKey = this.primaryKeyPair.publicKey;
    } else {
      throw Error('key pair is not loaded');
    }

    if (this.useWebWorkers && this.workerPool) {
      const workerResponse = await this.workerPool.queue(
        async (workerCrypto) => {
          return await workerCrypto.encryptData(
            data,
            pki.publicKeyToPem(resolvedKey),
          );
        },
      );
      return workerResponse;
    } else {
      const encryptedData = resolvedKey.encrypt(data);
      return encryptedData;
    }
  }

  /**
   * Encrypts the given file for a specific public key
   * @param filePath Path to file containing the data to be encrypted
   * @param publicKey Buffer containing the key to verify with. Defaults to primary public key if no key is given.
   */
  async encryptFile(
    filePath: string,
    publicKey?: string | Buffer,
  ): Promise<string> {
    // Get key if provided
    let keyBuffer: Buffer | undefined;
    if (publicKey) {
      if (typeof publicKey === 'string') {
        // Read in from fs
        keyBuffer = this.fileSystem.readFileSync(publicKey);
      } else {
        // Buffer
        keyBuffer = publicKey;
      }
    }
    // Read file into buffer
    const fileData = this.fileSystem.readFileSync(filePath);
    // Encrypt the buffer
    const encryptedBuffer = await this.encryptData(
      fileData.toString(),
      keyBuffer?.toString(),
    );
    // Write buffer to encrypted file
    this.fileSystem.writeFileSync(filePath, encryptedBuffer);
    return filePath;
  }

  /**
   * Decrypts the given data with the provided key or the primary key if none is given
   * @param data The data to be decrypted
   * @param privateKey The key to decrypt with. Defaults to primary private key if no key is given.
   * @param passphrase Required if privateKey is provided.
   */
  async decryptData(
    data: string,
    privateKey?: string,
    passphrase?: string,
  ): Promise<string> {
    let resolvedKey: pki.rsa.PrivateKey;
    if (privateKey) {
      if (!passphrase) {
        throw Error(
          'A key passphrase must be supplied if a privateKey is specified',
        );
      }
      resolvedKey = pki.decryptRsaPrivateKey(
        privateKey,
        passphrase,
      ) as pki.rsa.PrivateKey;
    } else if (this.primaryKeyPair.privateKey) {
      resolvedKey = this.primaryKeyPair.privateKey;
    } else {
      throw Error('no identity available for decrypting');
    }

    if (this.useWebWorkers && this.workerPool) {
      const workerResponse = await this.workerPool.queue(
        async (workerCrypto) => {
          return await workerCrypto.decryptData(
            data,
            pki.privateKeyToPem(resolvedKey),
          );
        },
      );
      return workerResponse;
    } else {
      const decryptedData = resolvedKey.decrypt(data);
      return decryptedData;
    }
  }

  /**
   * Decrypts the given file with the provided key or the primary key if none is given
   * @param filePath Path to file containing the data to be decrypted
   * @param privateKey The key to decrypt with. Defaults to primary private key if no key is given.
   * @param passphrase Required if privateKey is provided.
   */
  async decryptFile(
    filePath: string,
    privateKey?: string | Buffer,
    passphrase?: string,
  ): Promise<string> {
    // Get key if provided
    let keyBuffer: Buffer | undefined;
    if (privateKey) {
      if (typeof privateKey === 'string') {
        // Read in from fs
        keyBuffer = this.fileSystem.readFileSync(privateKey);
      } else {
        // Buffer
        keyBuffer = privateKey;
      }
    }
    // Read in file buffer
    const fileData = this.fileSystem.readFileSync(filePath);
    // Decrypt file buffer
    const decryptedData = await this.decryptData(
      fileData.toString(),
      keyBuffer?.toString(),
      passphrase,
    );
    // Write buffer to decrypted file
    this.fileSystem.writeFileSync(filePath, decryptedData);
    return filePath;
  }

  /* ============ HELPERS =============== */
  async writeFileWithMnemonic(path: string, data: Buffer): Promise<void> {
    return await this.mnemonicEfs.promises.writeFile(path, data, {});
  }
  async readFileWithMnemonic(path: string): Promise<Buffer> {
    return Buffer.from(await this.mnemonicEfs.promises.readFile(path));
  }

  /**
   * Get the key for a given name
   * @param name The unique name of the desired key
   */
  getKey(name: string): Buffer {
    return this.derivedKeys[name];
  }

  /**
   * Determines if the Key Manager has a certain key
   * @param name The unique name of the desired key
   */
  hasKey(name: string): boolean {
    if (this.derivedKeys[name]) {
      return true;
    }
    return false;
  }

  private async writeMetadata(): Promise<void> {
    const metadata = JSON.stringify(this.metadata);
    this.fileSystem.writeFileSync(this.metadataPath, metadata);
    await this.writeEncryptedMetadata();
  }

  private async writeEncryptedMetadata(): Promise<void> {
    // Store the keys if identity is loaded
    if (this.KeypairUnlocked) {
      // // write derived keys to file
      // const derivedKeys = JSON.stringify(this.derivedKeys);
      // const encryptedMetadata = await this.encryptData(derivedKeys);
      // await this.fileSystem.promises.writeFile(
      //   this.derivedKeysPath,
      //   encryptedMetadata,
      // );
      // // write mnemonic to file
      const encryptedMnemonic = await this.encryptData(this.mnemonic);
      await this.fileSystem.promises.writeFile(
        this.mnemonicFilePath,
        encryptedMnemonic,
      );
      const derivedKeys = JSON.stringify(this.derivedKeys);
      await this.writeFileWithMnemonic(
        this.derivedKeysPath,
        Buffer.from(derivedKeys),
      );
      // const encryptedMnemonic = JSON.stringify(this.mnemonic);
      // await this.writeFileWithMnemonic(
      //   this.mnemonicFilePath,
      //   Buffer.from(encryptedMnemonic),
      // );
    }
  }

  async loadMetadata(): Promise<void> {
    // Check if file exists
    if (this.fileSystem.existsSync(this.metadataPath)) {
      const metadata = this.fileSystem
        .readFileSync(this.metadataPath)
        .toString();
      this.metadata = JSON.parse(metadata);
      await this.loadEncryptedMetadata();
    }
  }

  async loadEncryptedMetadata(): Promise<void> {
    if (this.KeypairUnlocked) {
      if (this.fileSystem.existsSync(this.mnemonicFilePath)) {
        const encryptedMetadata = this.fileSystem
          .readFileSync(this.mnemonicFilePath)
          .toString();
        this.mnemonic = (await this.decryptData(encryptedMetadata)).toString();
        // this.mnemonic = (await this.readFileWithMnemonic(this.mnemonicFilePath)).toString();
      }
      if (this.fileSystem.existsSync(this.derivedKeysPath)) {
        const metadata = (
          await this.readFileWithMnemonic(this.derivedKeysPath)
        ).toString();
        const derivedKeys = JSON.parse(metadata);
        for (const key of Object.keys(derivedKeys)) {
          this.derivedKeys[key] = Buffer.from(derivedKeys[key]);
        }
      }
    }
  }
}

export default KeyManager;
export { KeyPair };
