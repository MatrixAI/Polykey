import os from 'os';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as kbpgp from 'kbpgp';
import * as bip39 from 'bip39';
import { promisify } from 'util';
import { Pool, ModuleThread } from 'threads';
import { KeyManagerWorker } from '../keys/KeyManagerWorker';
import PublicKeyInfrastructure from './pki/PublicKeyInfrastructure';

type KeyManagerMetadata = {
  privateKeyPath: string | null;
  publicKeyPath: string | null;
};

type KeyPair = {
  private: string | null;
  public: string | null;
};

class KeyManager {
  private primaryKeyPair: KeyPair = { private: null, public: null };
  private primaryIdentity?: Object;
  private primaryIdentityTimeout?: NodeJS.Timeout
  private derivedKeys: Map<string, Buffer>;
  private derivedKeysPath: string;
  private useWebWorkers: boolean;
  private workerPool?: Pool<ModuleThread<KeyManagerWorker>>;

  polykeyPath: string;
  private fileSystem: typeof fs;

  private keypairPath: string;
  private metadataPath: string;
  private metadata: KeyManagerMetadata = {
    privateKeyPath: null,
    publicKeyPath: null,
  };

  /////////
  // PKI //
  /////////
  pki: PublicKeyInfrastructure;

  constructor(
    polykeyPath: string = `${os.homedir()}/.polykey`,
    fileSystem: typeof fs,
    useWebWorkers: boolean = false,
    workerPool?: Pool<ModuleThread<KeyManagerWorker>>,
  ) {
    bip39.setDefaultWordlist('english')

    this.useWebWorkers = useWebWorkers;
    this.workerPool = workerPool;
    this.derivedKeys = new Map();
    this.fileSystem = fileSystem;

    // Load key manager metadata
    this.polykeyPath = polykeyPath;
    this.keypairPath = path.join(polykeyPath, '.keys');
    if (!this.fileSystem.existsSync(this.keypairPath)) {
      this.fileSystem.mkdirSync(this.keypairPath, { recursive: true });
    }
    this.metadataPath = path.join(this.keypairPath, 'metadata');
    this.derivedKeysPath = path.join(this.keypairPath, 'derived-keys');
    this.loadMetadata();

    // Load keys if they were provided
    if (this.metadata.privateKeyPath && this.metadata.publicKeyPath) {
      // Load files into memory
      this.loadKeyPair(this.metadata.publicKeyPath, this.metadata.privateKeyPath);
    }
    /////////
    // PKI //
    /////////
    this.pki = new PublicKeyInfrastructure(this.polykeyPath, this.fileSystem);
  }

  public get Status() {
    return {
      keypairUnlocked: this.KeypairUnlocked,
      keypairLoaded: this.KeypairLoaded,
    };
  }

  public get KeypairLoaded(): boolean {
    return this.primaryKeyPair.private != null && this.primaryKeyPair.public != null;
  }

  public get KeypairUnlocked(): boolean {
    return this.primaryIdentity ? true : false;
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
    userId: string,
    passphrase: string,
    replacePrimary: boolean = false,
    progressCallback?: (info) => void,
  ): Promise<KeyPair> {
    // Define options
    const params = {
      asp: progressCallback ? new kbpgp.ASP({ progress_hook: progressCallback }) : undefined,
      userid: userId,
    };

    // generateecc key pair with sensible defaults
    const identity = await promisify(kbpgp.KeyManager.generate_ecc)(params);
    await promisify(identity.sign.bind(identity))({});

    // Export pub key first
    const publicKey = await promisify(identity.export_pgp_public.bind(identity))({});

    // Finally export priv key
    const privateKey = await promisify(identity.export_pgp_private.bind(identity))({ passphrase: passphrase });

    // Resolve to parent promise
    const keypair = { private: privateKey, public: publicKey };
    if (replacePrimary) {
      // Set the new keypair
      this.primaryKeyPair = keypair;
      // Set the new identity
      this.primaryIdentity = identity;
      // Overwrite in memory
      const privateKeyPath = path.join(this.keypairPath, 'private_key');
      const publicKeyPath = path.join(this.keypairPath, 'public_key');
      await this.fileSystem.promises.writeFile(privateKeyPath, keypair.private);
      await this.fileSystem.promises.writeFile(publicKeyPath, keypair.public);
      // Set metadata
      this.metadata.privateKeyPath = privateKeyPath;
      this.metadata.publicKeyPath = publicKeyPath;
      this.writeMetadata();
    }

    return keypair;
  }

  /**
   * Get the primary keypair
   */
  getKeyPair(): KeyPair {
    return this.primaryKeyPair;
  }

  /**
   * Determines whether public key is loaded or not
   */
  hasPublicKey(): boolean {
    return this.primaryKeyPair.public ? true : false;
  }

  /**
   * Determines whether public key is loaded or not
   */
  hasPrivateKey(): boolean {
    return this.primaryKeyPair.private ? true : false;
  }

  /**
   * Get the public key of the primary keypair
   */
  getPublicKey(): string {
    if (!this.primaryKeyPair.public) {
      throw Error('public key does not exist in memory');
    }
    return this.primaryKeyPair.public;
  }

  /**
   * Get the private key of the primary keypair
   */
  getPrivateKey(): string {
    if (!this.primaryKeyPair.private) {
      throw Error('private key does not exist in memory');
    }
    return this.primaryKeyPair.private;
  }

  /**
   * Loads the keypair into the key manager as the primary identity
   * @param publicKey Public Key
   * @param privateKey Private Key
   */
  loadKeyPair(publicKey: string | Buffer, privateKey: string | Buffer): void {
    this.loadPrivateKey(privateKey);
    this.loadPublicKey(publicKey);
  }

  /**
   * Loads the private key into the primary keypair
   * @param privateKey Private Key
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
    this.primaryKeyPair.private = keyBuffer.toString();
  }

  /**
   * Loads the public key into the primary keypair
   * @param publicKey Public Key
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
    this.primaryKeyPair.public = keyBuffer.toString();
  }

  /**
   * Loads the primary identity into the key manager from the existing keypair
   * @param passphrase Passphrase to unlock the private key
   * @param timeout Minutes of inactivity after which identity is locked again
   */
  async unlockIdentity(passphrase: string, timeout: number = 15): Promise<void> {
    // check if already unlocked
    if (this.primaryIdentityTimeout && this.primaryIdentity) {
      clearTimeout(this.primaryIdentityTimeout)
    } else {
      const publicKey: string = this.getPublicKey();
      const privateKey: string = this.getPrivateKey();

      const identity = await promisify(kbpgp.KeyManager.import_from_armored_pgp)({ armored: publicKey });

      await promisify(identity.merge_pgp_private.bind(identity))({ armored: privateKey });

      if (identity.is_pgp_locked.bind(identity)()) {
        await promisify(identity.unlock_pgp.bind(identity))({ passphrase: passphrase });
      }

      this.primaryIdentity = identity;
    }
    if (timeout !== 0) {
      // set new timeout
      this.primaryIdentityTimeout = setTimeout(() => {
        this.lockIdentity()
      }, timeout * 60 * 1000)
    }
  }

  refreshTimeout(timeout: number = 15) {
    if (!this.primaryIdentityTimeout) {
      if (!this.primaryIdentity) {
        throw Error('node is locked')
      }
    } else {
      clearTimeout(this.primaryIdentityTimeout)
    }
    if (this.primaryIdentityTimeout) {
      this.primaryIdentityTimeout = this.primaryIdentityTimeout.refresh()
    } else {
      // set new timeout
      this.primaryIdentityTimeout = setTimeout(() => {
        this.lockIdentity()
      }, timeout * 60 * 1000)
    }
  }

  /**
   * Locks the primary identity
   */
  lockIdentity(): void {
    this.primaryIdentity = undefined;
  }

  /**
   * Export the primary private key to a specified location
   * @param path Destination path
   */
  exportPrivateKey(path: string): void {
    this.fileSystem.writeFileSync(path, this.primaryKeyPair.private);
    this.metadata.privateKeyPath = path;
    this.writeMetadata();
  }

  /**
   * Export the primary public key to a specified location
   * @param path Destination path
   */
  exportPublicKey(path: string): void {
    this.fileSystem.writeFileSync(path, this.primaryKeyPair.public);
    this.metadata.publicKeyPath = path;
    this.writeMetadata();
  }

  /**
   * Asynchronously Generates a new symmetric key and stores it in the key manager
   * @param name Unique name of the generated key
   * @param passphrase Passphrase to derive the key from
   * @param storeKey Whether to store the key in the key manager
   */
  async generateKey(name: string, passphrase: string, storeKey: boolean = true): Promise<Buffer> {
    const salt = crypto.randomBytes(32);
    const key = await promisify(crypto.pbkdf2)(passphrase, salt, 10000, 256 / 8, 'sha256');
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
  generateKeySync(name: string, passphrase: string, storeKey: boolean = true): Buffer {
    const salt = crypto.randomBytes(32);
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
  async exportKey(name: string, dest: string, createPath?: boolean): Promise<void> {
    if (!this.derivedKeys.has(name)) {
      throw Error(`There is no key loaded for name: ${name}`);
    }
    if (createPath) {
      await this.fileSystem.promises.mkdir(path.dirname(dest), { recursive: true });
    }
    await this.fileSystem.promises.writeFile(dest, this.derivedKeys[name]);
  }

  /**
   * Loads an identity from the given public key
   * @param publicKey Buffer containing the public key
   */
  async getIdentityFromPublicKey(publicKey: Buffer): Promise<Object> {
    const identity = await promisify(kbpgp.KeyManager.import_from_armored_pgp)({ armored: publicKey });
    return identity;
  }

  /**
   * Loads an identity from the given private key
   * @param publicKey Buffer containing the public key
   */
  async getIdentityFromPrivateKey(privateKey: Buffer, passphrase: string): Promise<Object> {
    const identity = await promisify(kbpgp.KeyManager.import_from_armored_pgp)({ armored: privateKey });
    if (identity.is_pgp_locked()) {
      await promisify(identity.unlock_pgp.bind(identity))({ passphrase });
    }
    return identity;
  }

  /**
   * Signs the given data with the provided key or the primary key if none is specified
   * @param data Buffer or file containing the data to be signed
   * @param privateKey Buffer containing the key to sign with. Defaults to primary private key if no key is given.
   * @param keyPassphrase Required if privateKey is provided.
   */
  async signData(data: Buffer | string, privateKey?: Buffer, keyPassphrase?: string): Promise<Buffer> {
    let resolvedIdentity: Object;
    if (privateKey) {
      if (!keyPassphrase) {
        throw Error('passphrase for private key was not provided');
      }
      resolvedIdentity = await this.getIdentityFromPrivateKey(privateKey, keyPassphrase!);
    } else if (this.primaryIdentity) {
      resolvedIdentity = this.primaryIdentity;
    } else {
      throw Error('key pair is not loaded');
    }

    if (this.useWebWorkers && this.workerPool) {
      const workerResponse = await this.workerPool.queue(async (workerCrypto) => {
        return await workerCrypto.signData(data, resolvedIdentity);
      });
      return workerResponse;
    } else {
      const params = {
        msg: data.toString(),
        sign_with: resolvedIdentity,
      };
      const result_string = await promisify(kbpgp.box)(params);

      return Buffer.from(result_string);
    }
  }

  /**
   * Signs the given file with the provided key or the primary key if none is specified
   * @param filePath Path to file containing the data to be signed
   * @param privateKey The key to sign with. Defaults to primary public key if no key is given.
   * @param keyPassphrase Required if privateKey is provided.
   */
  async signFile(filePath: string, privateKey?: string | Buffer, keyPassphrase?: string): Promise<string> {
    // Get key if provided
    let keyBuffer: Buffer;
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
    const signedBuffer = await this.signData(buffer, keyBuffer!, keyPassphrase);
    // Write buffer to signed file
    const signedPath = `${filePath}.sig`;
    this.fileSystem.writeFileSync(signedPath, signedBuffer);
    return signedPath;
  }

  /**
   * Verifies the given data with the provided key or the primary key if none is specified
   * @param data Buffer or file containing the data to be verified
   * @param publicKey Buffer containing the key to verify with. Defaults to primary public key if no key is given.
   */
  async verifyData(data: Buffer | string, publicKey?: Buffer): Promise<Buffer> {
    const ring = new kbpgp.keyring.KeyRing();
    let resolvedIdentity: any;
    if (publicKey) {
      resolvedIdentity = await this.getIdentityFromPublicKey(publicKey);
    } else if (this.primaryIdentity) {
      resolvedIdentity = this.primaryIdentity;
    } else {
      throw Error('key pair is not loaded');
    }
    ring.add_key_manager(resolvedIdentity);

    if (this.useWebWorkers && this.workerPool) {
      const workerResponse = await this.workerPool.queue(async (workerCrypto) => {
        return await workerCrypto.verifyData(data, resolvedIdentity);
      });
      return workerResponse;
    } else {
      const params = {
        armored: data,
        keyfetch: ring,
      };
      const literals = await promisify(kbpgp.unbox)(params);
      // get the verified message
      const verifiedMessage = Buffer.from(literals[0].toString());
      // Get the identity that signed the data if any
      let dataSigner = literals[0].get_data_signer();
      // Retrieve the key manager associated with that data signer
      let verifiedKM: any;
      if (dataSigner) {
        verifiedKM = dataSigner.get_key_manager();
      }
      if (!verifiedKM) {
        throw Error('data could not be verified: could not determine data signer');
      }
      // If we know the pgp finger print then we say the data is verified.
      // Otherwise it is unverified.
      const actualFingerprint = verifiedKM.get_pgp_fingerprint().toString('hex');
      const expectedFingerprint = resolvedIdentity.get_pgp_fingerprint().toString('hex');
      if (actualFingerprint == expectedFingerprint) {
        return verifiedMessage;
      } else {
        throw Error('data could not be verified: actual and expected data signer pgp fingerprint mismatch');
      }
    }
  }

  /**
   * Verifies the given file with the provided key or the primary key if none is specified
   * @param filePath Path to file containing the data to be verified
   * @param publicKey Buffer containing the key to verify with. Defaults to primary public key if no key is given.
   */
  async verifyFile(filePath: string, publicKey?: string | Buffer): Promise<boolean> {
    // Get key if provided
    let keyBuffer: Buffer;
    if (publicKey) {
      if (typeof publicKey === 'string') {
        // Path
        // Read in from fs
        keyBuffer = this.fileSystem.readFileSync(publicKey);
      } else {
        // Buffer
        keyBuffer = publicKey;
      }
    }
    // Read in file buffer and signature
    const signatureBuffer = this.fileSystem.readFileSync(filePath);
    const verifiedMessage = await this.verifyData(signatureBuffer, keyBuffer!);
    this.fileSystem.writeFileSync(filePath, verifiedMessage);

    return true;
  }

  /**
   * Encrypts the given data for a specific public key
   * @param data The data to be encrypted
   * @param publicKey The key to encrypt for
   */
  async encryptData(data: Buffer, publicKey?: Buffer): Promise<Buffer> {
    let resolvedIdentity: Object;
    if (publicKey) {
      resolvedIdentity = await this.getIdentityFromPublicKey(publicKey);
    } else if (this.primaryIdentity) {
      resolvedIdentity = this.primaryIdentity;
    } else {
      throw Error(`Identity could not be resolved for encrypting`);
    }

    if (this.useWebWorkers && this.workerPool) {
      const workerResponse = await this.workerPool.queue(async (workerCrypto) => {
        return await workerCrypto.encryptData(data, resolvedIdentity);
      });
      return workerResponse;
    } else {
      const params = {
        msg: data,
        encrypt_for: resolvedIdentity,
      };
      const result_string = await promisify(kbpgp.box)(params);
      return Buffer.from(result_string);
    }
  }

  /**
   * Encrypts the given file for a specific public key
   * @param filePath Path to file containing the data to be encrypted
   * @param publicKey Buffer containing the key to verify with. Defaults to primary public key if no key is given.
   */
  async encryptFile(filePath: string, publicKey?: string | Buffer): Promise<string> {
    // Get key if provided
    let keyBuffer: Buffer;
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
    const buffer = this.fileSystem.readFileSync(filePath);
    // Encrypt the buffer
    const encryptedBuffer = await this.encryptData(buffer, keyBuffer!);
    // Write buffer to encrypted file
    this.fileSystem.writeFileSync(filePath, encryptedBuffer);
    return filePath;
  }

  /**
   * Decrypts the given data with the provided key or the primary key if none is given
   * @param data The data to be decrypted
   * @param privateKey The key to decrypt with. Defaults to primary private key if no key is given.
   * @param keyPassphrase Required if privateKey is provided.
   */
  async decryptData(data: Buffer, privateKey?: Buffer, keyPassphrase?: string): Promise<Buffer> {
    var ring = new kbpgp.keyring.KeyRing();
    let resolvedIdentity: Object;
    if (privateKey) {
      if (keyPassphrase) {
        resolvedIdentity = await this.getIdentityFromPrivateKey(privateKey, keyPassphrase);
      } else {
        throw Error('A key passphrase must be supplied if a privateKey is specified');
      }
    } else if (this.primaryIdentity) {
      resolvedIdentity = this.primaryIdentity;
    } else {
      throw Error('no identity available for decrypting');
    }

    if (this.useWebWorkers && this.workerPool) {
      const workerResponse = await this.workerPool.queue(async (workerCrypto) => {
        return await workerCrypto.decryptData(data, resolvedIdentity);
      });
      return workerResponse;
    } else {
      ring.add_key_manager(resolvedIdentity);
      const params = {
        armored: data.toString(),
        keyfetch: ring,
      };
      const literals = await promisify(kbpgp.unbox)(params);
      const decryptedData = Buffer.from(literals[0].toString());
      return decryptedData;
    }
  }

  /**
   * Decrypts the given file with the provided key or the primary key if none is given
   * @param filePath Path to file containing the data to be decrypted
   * @param privateKey The key to decrypt with. Defaults to primary private key if no key is given.
   * @param keyPassphrase Required if privateKey is provided.
   */
  async decryptFile(filePath: string, privateKey?: string | Buffer, keyPassphrase?: string): Promise<string> {
    // Get key if provided
    let keyBuffer: Buffer;
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
    const fileBuffer = this.fileSystem.readFileSync(filePath);
    // Decrypt file buffer
    const decryptedData = await this.decryptData(fileBuffer, keyBuffer!, keyPassphrase);
    // Write buffer to decrypted file
    this.fileSystem.writeFileSync(filePath, decryptedData);
    return filePath;
  }

  /* ============ HELPERS =============== */
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
    this.writeEncryptedMetadata();
  }

  private async writeEncryptedMetadata(): Promise<void> {
    // Store the keys if identity is loaded
    if (this.KeypairUnlocked) {
      const derivedKeys = JSON.stringify(this.derivedKeys);
      const encryptedMetadata = await this.encryptData(Buffer.from(derivedKeys));
      await this.fileSystem.promises.writeFile(this.derivedKeysPath, encryptedMetadata);
    }
  }

  loadMetadata(): void {
    // Check if file exists
    if (this.fileSystem.existsSync(this.metadataPath)) {
      const metadata = this.fileSystem.readFileSync(this.metadataPath).toString();
      this.metadata = JSON.parse(metadata);
      this.loadEncryptedMetadata();
    }
  }

  async loadEncryptedMetadata(): Promise<void> {
    if (this.KeypairUnlocked && this.fileSystem.existsSync(this.derivedKeysPath)) {
      const encryptedMetadata = this.fileSystem.readFileSync(this.derivedKeysPath);
      const metadata = (await this.decryptData(encryptedMetadata)).toString();
      const derivedKeys = JSON.parse(metadata);
      for (const key of Object.keys(derivedKeys)) {
        this.derivedKeys[key] = Buffer.from(derivedKeys[key]);
      }
    }
  }
}

export default KeyManager;
export { KeyPair };
