import type { AbstractBatch } from 'abstract-leveldown';
import type { LevelDB } from 'level';
import type { MutexInterface } from 'async-mutex';
import type { DBDomain, DBLevel, DBOps } from './types';
import type { KeyPair, PrivateKey, PublicKey } from '../keys/types';
import type { FileSystem } from '../types';

import path from 'path';
import level from 'level';
import subleveldown from 'subleveldown';
import { Transfer } from 'threads';
import { Mutex } from 'async-mutex';
import Logger from '@matrixai/logger';
import * as dbUtils from './utils';
import * as dbErrors from './errors';
import { utils as keysUtils } from '../keys';
import { WorkerManager } from '../workers';
import * as utils from '../utils';

class DB {
  public static async createDB({
    dbPath,
    lock = new Mutex(),
    fs = require('fs'),
    logger = new Logger(this.name),
  }: {
    dbPath: string;
    lock?: MutexInterface;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    const db = new DB({
      dbKey,
      dbPath,
      lock,
      fs,
      logger,
    });
    await db.start();
    return db;
  }

  public readonly dbPath: string;
  public readonly dbKeyPath: string;

  protected dbKey: Buffer;
  protected lock: MutexInterface;
  protected fs: FileSystem;
  protected logger: Logger;
  protected workerManager?: WorkerManager;
  protected _db: LevelDB<string | Buffer, Buffer>;
  protected _started: boolean = false;
  protected _destroyed: boolean = false;

  // public constructor({
  //   dbPath,
  //   fs,
  //   logger,
  // }: {
  //   dbPath: string;
  //   fs?: FileSystem;
  //   logger?: Logger;
  // }) {
  //   this.logger = logger ?? new Logger(this.constructor.name);
  //   this.fs = fs ?? require('fs');
  //   this.dbPath = path.join(dbPath, 'db');
  //   this.dbKeyPath = path.join(dbPath, 'db_key');
  // }

  protected constructor({
    dbPath,
    lock,
    fs,
    logger,
  }: {
    dbPath: string;
    lock: MutexInterface;
    fs: FileSystem;
    logger: Logger;
  }) {
    this.logger = logger;
    this.dbPath = dbPath;
    this.lock = lock;
    this.fs = fs;
    this.dbPath = path.join(dbPath, 'db');
    this.dbKeyPath = path.join(dbPath, 'db_key');
  }

  get db(): LevelDB<string | Buffer, Buffer> {
    return this._db;
  }

  get locked(): boolean {
    return this.lock.isLocked();
  }

  get started(): boolean {
    return this._started;
  }

  get destroyed(): boolean {
    return this._destroyed;
  }

  public async start({
    keyPair,
    bits = 256,
    fresh = false,
  }: {
    keyPair: KeyPair;
    bits?: number;
    fresh?: boolean;
  }): Promise<void> {
    try {
      if (this._started) {
        return;
      }
      this.logger.info('Starting DB');
      this._started = true;
      this.logger.info(`Setting DB path to ${this.dbPath}`);
      if (fresh) {
        await this.fs.promises.rm(this.dbPath, {
          force: true,
          recursive: true,
        });
      }
      await utils.mkdirExists(this.fs, this.dbPath, { recursive: true });
      const db = await new Promise<LevelDB<string, Buffer>>(
        (resolve, reject) => {
          const db = level(this.dbPath, { valueEncoding: 'binary' }, (e) => {
            if (e != null) {
              reject(e);
            } else {
              resolve(db);
            }
          });
        },
      );
      const dbKey = await this.setupDbKey(keyPair, bits);
      this._db = db;
      this.dbKey = dbKey;
      this.logger.info('Started DB');
    } catch (e) {
      this._started = false;
      throw e;
    }
  }

  public async stop() {
    if (!this._started) {
      return;
    }
    this.logger.info('Stopping DB');
    this._started = false;
    await this.db.close();
    this.logger.info('Stopped DB');
  }

  public setWorkerManager(workerManager: WorkerManager) {
    this.workerManager = workerManager;
  }

  public unsetWorkerManager() {
    delete this.workerManager;
  }

  public async level(
    domain: string,
    dbLevel: DBLevel = this._db,
  ): Promise<DBLevel> {
    if (!this._started) {
      throw new dbErrors.ErrorDBNotStarted();
    }
    try {
      return new Promise<DBLevel>((resolve) => {
        const dbLevelNew = subleveldown(dbLevel, domain, {
          keyEncoding: 'binary',
          valueEncoding: 'binary',
          open: (cb) => {
            cb(undefined);
            resolve(dbLevelNew);
          },
        });
      });
    } catch (e) {
      if (e instanceof RangeError) {
        // some domain prefixes will conflict with the separator
        throw new dbErrors.ErrorDBLevelPrefix();
      }
      throw e;
    }
  }

  public async count(
    dbLevel: DBLevel = this._db
  ): Promise<number> {
    if (!this._started) {
      throw new dbErrors.ErrorDBNotStarted();
    }
    let count = 0;
    for await (const _ of dbLevel.createKeyStream()) {
      count++;
    }
    return count;
  }

  public async get<T>(
    domain: DBDomain,
    key: string | Buffer,
    raw?: false,
  ): Promise<T | undefined>;
  public async get<T>(
    domain: DBDomain,
    key: string | Buffer,
    raw: true,
  ): Promise<Buffer | undefined>;
  public async get<T>(
    domain: DBDomain,
    key: string | Buffer,
    raw: boolean = false
  ): Promise<T | undefined> {
    if (!this._started) {
      throw new dbErrors.ErrorDBNotStarted();
    }
    let data;
    try {
      data = await this._db.get(dbUtils.domainPath(domain, key));
    } catch (e) {
      if (e.notFound) {
        return undefined;
      }
      throw e;
    }
    return this.deserializeDecrypt<T>(data, raw as any);
  }

  public async put(
    domain: DBDomain,
    key: string | Buffer,
    value: any,
    raw?: false,
  ): Promise<void>;
  public async put(
    domain: DBDomain,
    key: string | Buffer,
    value: Buffer,
    raw: true,
  ): Promise<void>;
  public async put(
    domain: DBDomain,
    key: string | Buffer,
    value: any,
    raw: boolean = false
  ): Promise<void> {
    if (!this._started) {
      throw new dbErrors.ErrorDBNotStarted();
    }
    const data = await this.serializeEncrypt(value, raw as any);
    return this._db.put(dbUtils.domainPath(domain, key), data);
  }

  public async del(
    domain: DBDomain,
    key: string
  ): Promise<void> {
    if (!this._started) {
      throw new dbErrors.ErrorDBNotStarted();
    }
    return this._db.del(dbUtils.domainPath(domain, key));
  }

  public async batch(ops: Readonly<DBOps>): Promise<void> {
    if (!this._started) {
      throw new dbErrors.ErrorDBNotStarted();
    }
    const ops_: Array<AbstractBatch> = [];
    for (const op of ops) {
      if (op.type === 'del') {
        ops_.push({
          type: op.type,
          key: dbUtils.domainPath(op.domain, op.key),
        });
      } else if (op.type === 'put') {
        const data = await this.serializeEncrypt(
          op.value,
          (op.raw === true) as any,
        );
        ops_.push({
          type: op.type,
          key: dbUtils.domainPath(op.domain, op.key),
          value: data,
        });
      }
    }
    return this._db.batch(ops_);
  }

  public async serializeEncrypt(value: any, raw: false): Promise<Buffer>;
  public async serializeEncrypt(value: Buffer, raw: true): Promise<Buffer>;
  public async serializeEncrypt(
    value: any | Buffer,
    raw: boolean
  ): Promise<Buffer> {
    const plainText: Buffer = raw
      ? (value as Buffer)
      : dbUtils.serialize(value);
    if (this.workerManager != null) {
      return this.workerManager.call(async (w) => {
        const [
          cipherBuf,
          cipherOffset,
          cipherLength,
        ] = await w.encryptWithKey(
          Transfer(this.dbKey.buffer),
          this.dbKey.byteOffset,
          this.dbKey.byteLength,
          // @ts-ignore
          Transfer(plainText.buffer),
          plainText.byteOffset,
          plainText.byteLength,
        );
        return Buffer.from(cipherBuf, cipherOffset, cipherLength);
      });
    } else {
      return keysUtils.encryptWithKey(this.dbKey, plainText);
    }
  }

  public async deserializeDecrypt<T>(
    cipherText: Buffer,
    raw: false,
  ): Promise<T>;
  public async deserializeDecrypt<T>(
    cipherText: Buffer,
    raw: true,
  ): Promise<Buffer>;
  public async deserializeDecrypt<T>(
    cipherText: Buffer,
    raw: boolean
  ): Promise<T | Buffer> {
    let plainText;
    if (this.workerManager != null) {
      plainText = await this.workerManager.call(async (w) => {
        const decrypted = await w.decryptWithKey(
          Transfer(this.dbKey.buffer),
          this.dbKey.byteOffset,
          this.dbKey.byteLength,
          // @ts-ignore
          Transfer(cipherText.buffer),
          cipherText.byteOffset,
          cipherText.byteLength,
        );
        if (decrypted != null) {
          return Buffer.from(decrypted[0], decrypted[1], decrypted[2]);
        } else {
          return;
        }
      });
    } else {
      plainText = keysUtils.decryptWithKey(this.dbKey, cipherText);
    }
    if (plainText == null) {
      throw new dbErrors.ErrorDBDecrypt();
    }
    return raw ? plainText : dbUtils.deserialize<T>(plainText);
  }

  protected async setupDbKey(
    keyPair: KeyPair,
    bits: number = 256,
  ): Promise<Buffer> {
    let keyDbKey: Buffer;
    if (await this.existsDbKey()) {
      keyDbKey = await this.readDbKey(keyPair.privateKey);
    } else {
      this.logger.info('Generating keys db key');
      keyDbKey = await keysUtils.generateKey(bits);
      await this.writeDbKey(keyPair.publicKey, keyDbKey);
    }
    return keyDbKey;
  }

  protected async existsDbKey(): Promise<boolean> {
    this.logger.info(`Checking ${this.dbKeyPath}`);
    try {
      await this.fs.promises.stat(this.dbKeyPath);
    } catch (e) {
      if (e.code === 'ENOENT') {
        return false;
      }
      throw new dbErrors.ErrorDBKeyRead(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
    return true;
  }

  protected async readDbKey(privateKey: PrivateKey): Promise<Buffer> {
    let keysDbKeyCipher;
    this.logger.info(`Reading ${this.dbKeyPath}`);
    try {
      keysDbKeyCipher = await this.fs.promises.readFile(this.dbKeyPath);
    } catch (e) {
      throw new dbErrors.ErrorDBKeyRead(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
    let keysDbKeyPlain;
    try {
      keysDbKeyPlain = keysUtils.decryptWithPrivateKey(
        privateKey,
        keysDbKeyCipher,
      );
    } catch (e) {
      throw new dbErrors.ErrorDBKeyParse(e.message);
    }
    return keysDbKeyPlain;
  }

  protected async writeDbKey(
    publicKey: PublicKey,
    keysDbKeyPlain: Buffer,
  ): Promise<void> {
    const keysDbKeyCipher = keysUtils.encryptWithPublicKey(
      publicKey,
      keysDbKeyPlain,
    );
    this.logger.info(`Writing ${this.dbKeyPath}`);
    try {
      await this.fs.promises.writeFile(
        `${this.dbKeyPath}.tmp`,
        keysDbKeyCipher,
      );
      await this.fs.promises.rename(`${this.dbKeyPath}.tmp`, this.dbKeyPath);
    } catch (e) {
      throw new dbErrors.ErrorDBKeyWrite(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
  }
}

export default DB;
