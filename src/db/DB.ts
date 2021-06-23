import type { AbstractBatch } from 'abstract-leveldown';
import type { LevelDB } from 'level';
import type { DBLevel, DBOp } from './types';
import type { KeyManager } from '../keys';
import type { FileSystem } from '../types';

import level from 'level';
import subleveldown from 'subleveldown';
import Logger from '@matrixai/logger';
import * as dbUtils from './utils';
import * as dbErrors from './errors';
import { utils as keysUtils, errors as keysErrors } from '../keys';
import * as utils from '../utils';

class DB {
  public readonly dbPath: string;

  protected logger: Logger;
  protected fs: FileSystem;
  protected keyManager: KeyManager;
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
    keyManager,
    fs,
    logger,
  }: {
    dbPath: string;
    keyManager: KeyManager;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(this.constructor.name);
    this.fs = fs ?? require('fs');
    this.dbPath = dbPath;
    this.keyManager = keyManager;
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
      this.logger.info('Starting DB');
      this._started = true;
      if (!this.keyManager.started) {
        throw new keysErrors.ErrorKeyManagerNotStarted();
      }
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
      const dbKey = await this.setupDbKey(bits);
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

  protected async setupDbKey(bits: number = 256): Promise<Buffer> {
    let dbKey = await this.keyManager.getKey(this.constructor.name);
    if (dbKey != null) {
      return dbKey;
    }
    this.logger.info('Generating DB key');
    dbKey = await keysUtils.generateKey(bits);
    await this.keyManager.putKey(this.constructor.name, dbKey);
    return dbKey;
  }
}

export default DB;
