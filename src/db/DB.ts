import type { AbstractBatch } from 'abstract-leveldown';
import type { LevelDB } from 'level';
import type { DBLevel, DBOp } from './types';
import type { KeyPair, PrivateKey, PublicKey } from '../keys/types';
import type { FileSystem } from '../types';

import path from 'path';
import level from 'level';
import subleveldown from 'subleveldown';
import Logger from '@matrixai/logger';
import * as dbUtils from './utils';
import * as dbErrors from './errors';
import { utils as keysUtils } from '../keys';
import * as utils from '../utils';

class DB {
  public readonly dbPath: string;
  public readonly dbKeyPath: string;

  protected logger: Logger;
  protected fs: FileSystem;
  protected _db: LevelDB<string, Buffer>;
  protected dbKey: Buffer;
  protected _started: boolean = false;

  get db(): LevelDB<string, Buffer> {
    return this._db;
  }

  get started(): boolean {
    return this._started;
  }

  public constructor({
    dbPath,
    fs,
    logger,
  }: {
    dbPath: string;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(this.constructor.name);
    this.fs = fs ?? require('fs');
    this.dbPath = path.join(dbPath, 'db');
    this.dbKeyPath = path.join(dbPath, 'db_key');
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
            if (e) {
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
    this.logger.info('Stopping ACL');
    this._started = false;
    await this.db.close();
    this.logger.info('Stopped ACL');
  }

  public async level<K>(
    domain: string,
    dbLevel: DBLevel<any> = this.db,
  ): Promise<DBLevel<K>> {
    return await new Promise<DBLevel<K>>((resolve) => {
      const dbLevelNew = subleveldown<K, Buffer>(dbLevel, domain, {
        valueEncoding: 'binary',
        open: (cb) => {
          cb(undefined);
          resolve(dbLevelNew);
        },
      });
    });
  }

  public async get<T>(
    domain: Array<string>,
    key: string,
  ): Promise<T | undefined> {
    if (!this._started) {
      throw new dbErrors.ErrorDBNotStarted();
    }
    let data: Buffer;
    try {
      data = await this._db.get(dbUtils.domainPath(domain, key));
    } catch (e) {
      if (e.notFound) {
        return undefined;
      }
      throw e;
    }
    return this.unserializeDecrypt<T>(data);
  }

  public async put<T>(
    domain: Array<string>,
    key: string,
    value: T,
  ): Promise<void> {
    if (!this._started) {
      throw new dbErrors.ErrorDBNotStarted();
    }
    const data = this.serializeEncrypt<T>(value);
    await this._db.put(dbUtils.domainPath(domain, key), data);
  }

  public async del(domain: Array<string>, key: string): Promise<void> {
    if (!this._started) {
      throw new dbErrors.ErrorDBNotStarted();
    }
    await this._db.del(dbUtils.domainPath(domain, key));
  }

  public async batch(ops: Array<DBOp>): Promise<void> {
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
        const data = this.serializeEncrypt(op.value);
        ops_.push({
          type: op.type,
          key: dbUtils.domainPath(op.domain, op.key),
          value: data,
        });
      }
    }
    await this._db.batch(ops_);
  }

  public serializeEncrypt<T>(value: T): Buffer {
    return dbUtils.serializeEncrypt(this.dbKey, value);
  }

  public unserializeDecrypt<T>(data: Buffer): T {
    return dbUtils.unserializeDecrypt(this.dbKey, data);
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
