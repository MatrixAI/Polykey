import type {
  KeyPair,
  Certificate,
  KeyPairPem,
  CertificatePem,
  CertificatePemChain,
} from './types';
import type { FileSystem } from '../types';
import type { WorkerManager } from '../workers';
import type { NodeId } from '../nodes/types';

import path from 'path';
import Logger from '@matrixai/logger';
import * as keysUtils from './utils';
import * as keysErrors from './errors';
import * as utils from '../utils';
import * as networkUtils from '../network/utils';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';
import { VaultKey } from "../vaults/types";

/**
 * Manage Root Keys and Root Certificates
 */
interface KeyManager extends CreateDestroy {}
@CreateDestroy()
class KeyManager {
  public readonly keysPath: string;
  public readonly rootPubPath: string;
  public readonly rootKeyPath: string;
  public readonly rootCertPath: string;
  public readonly rootCertsPath: string;
  public readonly dbKeyPath: string;
  public readonly vaultKeyPath: string;

  protected fs: FileSystem;
  protected logger: Logger;
  protected rootKeyPair: KeyPair;
  protected _dbKey: Buffer;
  protected _vaultKey: Buffer;
  protected rootCert: Certificate;
  protected workerManager?: WorkerManager;

  static async createKeyManager({
    keysPath,
    password,
    fs,
    logger,
    rootKeyPairBits,
    rootCertDuration,
    dbKeyBits,
    fresh,
  }: {
    keysPath: string;
    password: string;
    fs?: FileSystem;
    logger?: Logger;
    rootKeyPairBits?: number;
    rootCertDuration?: number;
    dbKeyBits?: number;
    fresh?: boolean;
  }): Promise<KeyManager> {
    const logger_ = logger ?? new Logger(this.constructor.name);
    const fs_ = fs ?? require('fs');

    const keyManager_ = new KeyManager({ fs: fs_, logger: logger_, keysPath });
    await keyManager_.create({
      password,
      rootKeyPairBits,
      rootCertDuration,
      dbKeyBits,
      fresh,
    });
    return keyManager_;
  }

  constructor({
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
    this.rootPubPath = path.join(keysPath, 'root.pub');
    this.rootKeyPath = path.join(keysPath, 'root.key');
    this.rootCertPath = path.join(keysPath, 'root.crt');
    this.rootCertsPath = path.join(keysPath, 'root_certs');
    this.dbKeyPath = path.join(keysPath, 'db.key');
    this.vaultKeyPath = path.join(keysPath, 'vault.key');
  }

  public setWorkerManager(workerManager: WorkerManager) {
    this.workerManager = workerManager;
  }

  public unsetWorkerManager() {
    delete this.workerManager;
  }

  protected async create({
    password,
    rootKeyPairBits = 4096,
    rootCertDuration = 31536000,
    dbKeyBits = 256,
    vaultKeyBits = 256,
    fresh = false,
  }: {
    password: string;
    rootKeyPairBits?: number;
    rootCertDuration?: number;
    dbKeyBits?: number;
    vaultKeyBits?: number;
    fresh?: boolean;
  }) {
    this.logger.info('Creating Key Manager');
    this.logger.info(`Setting keys path to ${this.keysPath}`);
    if (fresh) {
      await this.fs.promises.rm(this.keysPath, {
        force: true,
        recursive: true,
      });
    }
    await utils.mkdirExists(this.fs, this.keysPath);
    await utils.mkdirExists(this.fs, this.rootCertsPath);
    const rootKeyPair = await this.setupRootKeyPair(password, rootKeyPairBits);
    const rootCert = await this.setupRootCert(rootKeyPair, rootCertDuration);
    this.rootKeyPair = rootKeyPair;
    this.rootCert = rootCert;
    this._dbKey = await this.setupKey(this.dbKeyPath, dbKeyBits);
    this._vaultKey = await this.setupKey(this.vaultKeyPath, vaultKeyBits);
    this.logger.info('Created Key Manager');
  }

  public async destroy() {
    this.logger.info('Destroyed Key Manager');
  }

  @ready(new keysErrors.ErrorKeyManagerDestroyed())
  public getRootKeyPair(): KeyPair {
    return keysUtils.keyPairCopy(this.rootKeyPair);
  }

  @ready(new keysErrors.ErrorKeyManagerDestroyed())
  public getRootKeyPairPem(): KeyPairPem {
    return keysUtils.keyPairToPem(this.rootKeyPair);
  }

  @ready(new keysErrors.ErrorKeyManagerDestroyed())
  public getRootCert(): Certificate {
    return keysUtils.certCopy(this.rootCert);
  }

  @ready(new keysErrors.ErrorKeyManagerDestroyed())
  public getRootCertPem(): CertificatePem {
    return keysUtils.certToPem(this.rootCert);
  }

  /**
   * Gets an array of certificates in order of leaf to root
   */
  @ready(new keysErrors.ErrorKeyManagerDestroyed())
  public async getRootCertChain(): Promise<Array<Certificate>> {
    const rootCertsNames = await this.getRootCertsNames();
    const rootCertsPems = await this.getRootCertsPems(rootCertsNames);
    const rootCerts = rootCertsPems.map((p) => {
      return keysUtils.certFromPem(p);
    });
    return [keysUtils.certCopy(this.rootCert), ...rootCerts];
  }

  /**
   * Gets an array of certificate pems in order of leaf to root
   */
  @ready(new keysErrors.ErrorKeyManagerDestroyed())
  public async getRootCertChainPems(): Promise<Array<CertificatePem>> {
    const rootCertsNames = await this.getRootCertsNames();
    const rootCertsPems = await this.getRootCertsPems(rootCertsNames);
    const rootCertPems = [keysUtils.certToPem(this.rootCert), ...rootCertsPems];
    return rootCertPems;
  }

  /**
   * Gets a concatenated certificate pem ordered from leaf to root
   */
  @ready(new keysErrors.ErrorKeyManagerDestroyed())
  public async getRootCertChainPem(): Promise<CertificatePemChain> {
    const rootCertPems = await this.getRootCertChainPems();
    return rootCertPems.join('');
  }

  /**
   * Gets the node ID from the root certificate.
   */
  @ready(new keysErrors.ErrorKeyManagerDestroyed())
  public getNodeId(): NodeId {
    return networkUtils.certNodeId(this.getRootCert());
  }

  @ready(new keysErrors.ErrorKeyManagerDestroyed())
  public async encryptWithRootKeyPair(plainText: Buffer): Promise<Buffer> {
    const publicKey = this.rootKeyPair.publicKey;
    let cipherText;
    if (this.workerManager) {
      cipherText = await this.workerManager.call(async (w) => {
        const publicKeyAsn1 = keysUtils.publicKeyToAsn1(publicKey);
        return Buffer.from(
          await w.encryptWithPublicKeyAsn1(
            publicKeyAsn1,
            plainText.toString('binary'),
          ),
          'binary',
        );
      });
    } else {
      cipherText = keysUtils.encryptWithPublicKey(publicKey, plainText);
    }
    return cipherText;
  }

  @ready(new keysErrors.ErrorKeyManagerDestroyed())
  public async decryptWithRootKeyPair(cipherText: Buffer): Promise<Buffer> {
    const privateKey = this.rootKeyPair.privateKey;
    let plainText;
    if (this.workerManager) {
      plainText = await this.workerManager.call(async (w) => {
        const privateKeyAsn1 = keysUtils.privateKeyToAsn1(privateKey);
        return Buffer.from(
          await w.decryptWithPrivateKeyAsn1(
            privateKeyAsn1,
            cipherText.toString('binary'),
          ),
          'binary',
        );
      });
    } else {
      plainText = keysUtils.decryptWithPrivateKey(privateKey, cipherText);
    }
    return plainText;
  }

  @ready(new keysErrors.ErrorKeyManagerDestroyed())
  public async signWithRootKeyPair(data: Buffer): Promise<Buffer> {
    const privateKey = this.rootKeyPair.privateKey;
    let signature;
    if (this.workerManager) {
      signature = await this.workerManager.call(async (w) => {
        const privateKeyAsn1 = keysUtils.privateKeyToAsn1(privateKey);
        return Buffer.from(
          await w.signWithPrivateKeyAsn1(
            privateKeyAsn1,
            data.toString('binary'),
          ),
          'binary',
        );
      });
    } else {
      signature = keysUtils.signWithPrivateKey(privateKey, data);
    }
    return signature;
  }

  @ready(new keysErrors.ErrorKeyManagerDestroyed())
  public async verifyWithRootKeyPair(
    data: Buffer,
    signature: Buffer,
  ): Promise<boolean> {
    const publicKey = this.rootKeyPair.publicKey;
    let signed;
    if (this.workerManager) {
      signed = await this.workerManager.call(async (w) => {
        const publicKeyAsn1 = keysUtils.publicKeyToAsn1(publicKey);
        return w.verifyWithPublicKeyAsn1(
          publicKeyAsn1,
          data.toString('binary'),
          signature.toString('binary'),
        );
      });
    } else {
      signed = keysUtils.verifyWithPublicKey(publicKey, data, signature);
    }
    return signed;
  }

  @ready(new keysErrors.ErrorKeyManagerDestroyed())
  public async changeRootKeyPassword(password: string): Promise<void> {
    this.logger.info('Changing root key pair password');
    await this.writeRootKeyPair(this.rootKeyPair, password);
  }

  /**
   * Generates a new root key pair
   * Forces a generation of a leaf certificate as the new root certificate
   * The new root certificate is self-signed and also signed by the previous certificate
   * The parent signature is encoded with a custom Polykey extension
   * This maintains a certificate chain that provides zero-downtime migration
   */
  @ready(new keysErrors.ErrorKeyManagerDestroyed())
  public async renewRootKeyPair(
    password: string,
    bits: number = 4096,
    duration: number = 31536000,
    subjectAttrsExtra: Array<{ name: string; value: string }> = [],
    issuerAttrsExtra: Array<{ name: string; value: string }> = [],
  ): Promise<void> {
    this.logger.info('Renewing root key pair');
    const keysDbKeyPlain = await this.readKey(this.dbKeyPath);
    const keysVaultKeyPlain = await this.readKey(this.vaultKeyPath);
    const rootKeyPair = await this.generateKeyPair(bits);
    const now = new Date();
    const rootCert = keysUtils.generateCertificate(
      rootKeyPair.publicKey,
      rootKeyPair.privateKey,
      this.rootKeyPair.privateKey,
      duration,
      subjectAttrsExtra,
      issuerAttrsExtra,
    );
    this.logger.info(
      `Copying old root key pair to ${
        this.rootCertsPath
      }/root.crt.${utils.getUnixtime(now)}`,
    );
    try {
      await this.fs.promises.copyFile(
        this.rootCertPath,
        `${this.rootCertsPath}/root.crt.${utils.getUnixtime(now)}`,
      );
    } catch (e) {
      throw new keysErrors.ErrorRootCertRenew(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
    await this.garbageCollectRootCerts();
    await Promise.all([
      this.writeRootKeyPair(rootKeyPair, password),
      this.writeRootCert(rootCert),
      this.writeKey(keysDbKeyPlain, this.dbKeyPath, rootKeyPair),
      this.writeKey(keysVaultKeyPlain, this.vaultKeyPath, rootKeyPair),
    ]);
    this.rootKeyPair = rootKeyPair;
    this.rootCert = rootCert;
  }

  /**
   * Generates a new root key pair
   * Forces a reset of a new root certificate
   * The new root certificate is self-signed
   */
  @ready(new keysErrors.ErrorKeyManagerDestroyed())
  public async resetRootKeyPair(
    password: string,
    bits: number = 4096,
    duration: number = 31536000,
    subjectAttrsExtra: Array<{ name: string; value: string }> = [],
    issuerAttrsExtra: Array<{ name: string; value: string }> = [],
  ): Promise<void> {
    this.logger.info('Resetting root key pair');
    const keysDbKeyPlain = await this.readKey(this.dbKeyPath);
    const keysVaultKeyPlain = await this.readKey(this.vaultKeyPath);
    const rootKeyPair = await this.generateKeyPair(bits);
    const rootCert = keysUtils.generateCertificate(
      rootKeyPair.publicKey,
      rootKeyPair.privateKey,
      rootKeyPair.privateKey,
      duration,
      subjectAttrsExtra,
      issuerAttrsExtra,
    );
    // Removes the cert chain
    await this.garbageCollectRootCerts(true);
    await Promise.all([
      this.writeRootKeyPair(rootKeyPair, password),
      this.writeRootCert(rootCert),
      this.writeKey(keysDbKeyPlain, this.dbKeyPath, rootKeyPair),
      this.writeKey(keysVaultKeyPlain, this.vaultKeyPath, rootKeyPair)
    ]);
    this.rootKeyPair = rootKeyPair;
    this.rootCert = rootCert;
  }

  /**
   * Generates a new root certificate
   * The new root certificate is self-signed
   */
  @ready(new keysErrors.ErrorKeyManagerDestroyed())
  public async resetRootCert(
    duration: number = 31536000,
    subjectAttrsExtra: Array<{ name: string; value: string }> = [],
    issuerAttrsExtra: Array<{ name: string; value: string }> = [],
  ): Promise<void> {
    this.logger.info('Resetting root certificate');
    const rootCert = keysUtils.generateCertificate(
      this.rootKeyPair.publicKey,
      this.rootKeyPair.privateKey,
      this.rootKeyPair.privateKey,
      duration,
      subjectAttrsExtra,
      issuerAttrsExtra,
    );
    // Removes the cert chain
    await this.garbageCollectRootCerts(true);
    await this.writeRootCert(rootCert);
    this.rootCert = rootCert;
  }
  @ready(new keysErrors.ErrorKeyManagerDestroyed())
  public async garbageCollectRootCerts(force: boolean = false): Promise<void> {
    this.logger.info('Performing garbage collection of root certificates');
    const now = new Date();
    const rootCertsNames = await this.getRootCertsNames();
    const rootCertsPems = await this.getRootCertsPems(rootCertsNames);
    const rootCerts = rootCertsPems.map((p) => {
      return keysUtils.certFromPem(p);
    });
    try {
      for (const [i, rootCert] of rootCerts.entries()) {
        if (force || rootCert.validity.notAfter < now) {
          this.logger.info(
            `Deleting ${this.rootCertsPath}/${rootCertsNames[i]}`,
          );
          await this.fs.promises.rm(
            `${this.rootCertsPath}/${rootCertsNames[i]}`,
          );
        }
      }
    } catch (e) {
      throw new keysErrors.ErrorRootCertsGC(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
  }

  protected async setupRootKeyPair(
    password: string,
    bits: number = 4096,
  ): Promise<KeyPair> {
    let rootKeyPair;
    if (await this.existsRootKeyPair()) {
      rootKeyPair = await this.readRootKeyPair(password);
    } else {
      this.logger.info('Generating root key pair');
      rootKeyPair = await this.generateKeyPair(bits);
      await this.writeRootKeyPair(rootKeyPair, password);
    }
    return rootKeyPair;
  }

  protected async existsRootKeyPair(): Promise<boolean> {
    this.logger.info(`Checking ${this.rootPubPath} and ${this.rootKeyPath}`);
    try {
      await Promise.all([
        this.fs.promises.stat(this.rootPubPath),
        this.fs.promises.stat(this.rootKeyPath),
      ]);
    } catch (e) {
      if (e.code === 'ENOENT') {
        return false;
      }
      throw new keysErrors.ErrorRootKeysRead(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
    return true;
  }

  protected async readRootKeyPair(password: string): Promise<KeyPair> {
    let publicKeyPem, privateKeyPem;
    this.logger.info(`Reading ${this.rootPubPath} and ${this.rootKeyPath}`);
    try {
      [publicKeyPem, privateKeyPem] = await Promise.all([
        this.fs.promises.readFile(this.rootPubPath, { encoding: 'utf8' }),
        this.fs.promises.readFile(this.rootKeyPath, { encoding: 'utf8' }),
      ]);
    } catch (e) {
      throw new keysErrors.ErrorRootKeysRead(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
    let keyPair;
    try {
      keyPair = keysUtils.keyPairFromPemEncrypted(
        {
          publicKey: publicKeyPem,
          privateKey: privateKeyPem,
        },
        password,
      );
    } catch (e) {
      throw new keysErrors.ErrorRootKeysParse(e.message);
    }
    return keyPair;
  }

  protected async writeRootKeyPair(
    keyPair: KeyPair,
    password: string,
  ): Promise<void> {
    const keyPairPem = keysUtils.keyPairToPemEncrypted(keyPair, password);
    this.logger.info(`Writing ${this.rootPubPath} and ${this.rootKeyPath}`);
    try {
      await Promise.all([
        this.fs.promises.writeFile(
          `${this.rootPubPath}.tmp`,
          keyPairPem.publicKey,
        ),
        this.fs.promises.writeFile(
          `${this.rootKeyPath}.tmp`,
          keyPairPem.privateKey,
        ),
      ]);
      await Promise.all([
        this.fs.promises.rename(`${this.rootPubPath}.tmp`, this.rootPubPath),
        this.fs.promises.rename(`${this.rootKeyPath}.tmp`, this.rootKeyPath),
      ]);
    } catch (e) {
      throw new keysErrors.ErrorRootKeysWrite(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
  }

  // Functions that handle the DB key.

  protected async setupKey(keyPath: string, bits: number = 256): Promise<Buffer> {
    let keyDbKey: Buffer;
    if (await this.existsKey(keyPath)) {
      keyDbKey = await this.readKey(keyPath);
    } else {
      this.logger.info('Generating keys db key');
      keyDbKey = await keysUtils.generateKey(bits);
      await this.writeKey(keyDbKey, keyPath);
    }
    return keyDbKey;
  }

  protected async existsKey(keyPath: string): Promise<boolean> {
    this.logger.info(`Checking ${keyPath}`);
    try {
      await this.fs.promises.stat(keyPath);
    } catch (e) {
      if (e.code === 'ENOENT') {
        return false;
      }
      throw new keysErrors.ErrorDBKeyRead(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
    return true;
  }

  protected async readKey(keyPath: string): Promise<Buffer> {
    this.logger.info(`Reading ${keyPath}`);
    let keysDbKeyCipher;
    try {
      keysDbKeyCipher = await this.fs.promises.readFile(keyPath);
    } catch (e) {
      throw new keysErrors.ErrorDBKeyRead(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
    let keysDbKeyPlain;
    try {
      keysDbKeyPlain = keysUtils.decryptWithPrivateKey(
        this.rootKeyPair.privateKey,
        keysDbKeyCipher,
      );
    } catch (e) {
      throw new keysErrors.ErrorDBKeyParse(e.message);
    }
    return keysDbKeyPlain;
  }

  protected async writeKey(dbKey: Buffer, keyPath: string, keyPair?: KeyPair): Promise<void> {
    const keyPair_ = keyPair ?? this.rootKeyPair;
    const keysDbKeyCipher = keysUtils.encryptWithPublicKey(
      keyPair_.publicKey,
      dbKey,
    );
    this.logger.info(`Writing ${keyPath}`);
    try {
      await this.fs.promises.writeFile(
        `${keyPath}.tmp`,
        keysDbKeyCipher,
      );
      await this.fs.promises.rename(`${keyPath}.tmp`, keyPath);
    } catch (e) {
      throw new keysErrors.ErrorDBKeyWrite(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
  }

  get dbKey(): Buffer {
    return this._dbKey;
  }

  get vaultKey(): VaultKey {
    return this._vaultKey as VaultKey;
  }

  // ---

  /**
   * Generates a key pair
   * Uses the worker manager if available
   */
  protected async generateKeyPair(bits: number): Promise<KeyPair> {
    let keyPair;
    if (this.workerManager) {
      keyPair = await this.workerManager.call(async (w) => {
        const keyPair = await w.generateKeyPairAsn1(bits);
        return keysUtils.keyPairFromAsn1(keyPair);
      });
    } else {
      keyPair = await keysUtils.generateKeyPair(bits);
    }
    return keyPair;
  }

  protected async setupRootCert(
    keyPair: KeyPair,
    duration: number = 31536000,
    subjectAttrsExtra: Array<{ name: string; value: string }> = [],
    issuerAttrsExtra: Array<{ name: string; value: string }> = [],
  ): Promise<Certificate> {
    let rootCert;
    if (await this.existsRootCert()) {
      rootCert = await this.readRootCert();
    } else {
      this.logger.info('Generating root certificate');
      rootCert = keysUtils.generateCertificate(
        keyPair.publicKey,
        keyPair.privateKey,
        keyPair.privateKey,
        duration,
        subjectAttrsExtra,
        issuerAttrsExtra,
      );
      await this.writeRootCert(rootCert);
    }
    return rootCert;
  }

  protected async existsRootCert(): Promise<boolean> {
    this.logger.info(`Checking ${this.rootCertPath}`);
    try {
      await this.fs.promises.stat(this.rootCertPath);
    } catch (e) {
      if (e.code === 'ENOENT') {
        return false;
      }
      throw new keysErrors.ErrorRootCertRead(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
    return true;
  }

  protected async readRootCert(): Promise<Certificate> {
    let rootCertPem;
    this.logger.info(`Reading ${this.rootCertPath}`);
    try {
      rootCertPem = await this.fs.promises.readFile(this.rootCertPath, {
        encoding: 'utf8',
      });
    } catch (e) {
      throw new keysErrors.ErrorRootCertRead(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
    const rootCert = keysUtils.certFromPem(rootCertPem);
    return rootCert;
  }

  protected async writeRootCert(rootCert: Certificate): Promise<void> {
    const rootCertPem = keysUtils.certToPem(rootCert);
    this.logger.info(`Writing ${this.rootCertPath}`);
    try {
      await this.fs.promises.writeFile(`${this.rootCertPath}.tmp`, rootCertPem);
      await this.fs.promises.rename(
        `${this.rootCertPath}.tmp`,
        this.rootCertPath,
      );
    } catch (e) {
      throw new keysErrors.ErrorRootCertWrite(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
  }

  /**
   * Gets a sorted array of all the prior root certs names
   * The sort order is from most recent to oldest
   * This does not include the current root cert
   */
  protected async getRootCertsNames(): Promise<Array<string>> {
    let rootCertsNames;
    try {
      rootCertsNames = await this.fs.promises.readdir(this.rootCertsPath);
    } catch (e) {
      throw new keysErrors.ErrorRootCertRead(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
    rootCertsNames.sort((a, b) => {
      const a_ = parseInt(a.split('.').pop()!);
      const b_ = parseInt(b.split('.').pop()!);
      if (a_ < b_) {
        return 1;
      } else if (a_ > b_) {
        return -1;
      }
      return 0;
    });
    return rootCertsNames;
  }

  /**
   * Gets a sorted array of all the prior root certs pems
   * This does not include the current root cert
   */
  protected async getRootCertsPems(
    rootCertsNames: Array<string>,
  ): Promise<Array<CertificatePem>> {
    let rootCertsPems: Array<CertificatePem>;
    try {
      rootCertsPems = await Promise.all(
        rootCertsNames.map(async (n) => {
          return await this.fs.promises.readFile(`${this.rootCertsPath}/${n}`, {
            encoding: 'utf8',
          });
        }),
      );
    } catch (e) {
      throw new keysErrors.ErrorRootCertRead(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
    return rootCertsPems;
  }
}

export default KeyManager;
