import type {
  AbstractBatch,
  AbstractLevelDOWN,
  AbstractIterator,
} from 'abstract-leveldown';
import type { LevelDB } from 'level';
import type { LevelUp } from 'levelup';
import type { VaultMapOp, VaultId, Vaults } from './types';
import type { KeyManager } from '../keys';
import type { FileSystem } from '../types';

import path from 'path';
import level from 'level';
import subleveldown from 'subleveldown';
import sublevelprefixer from 'sublevel-prefixer';
import { Mutex } from 'async-mutex';
import Logger from '@matrixai/logger';

import { Vault } from './';

import * as vaultUtils from './utils';
import * as vaultErrors from './errors';
import { utils as keysUtils, errors as keysErrors } from '../keys';
import * as utils from '../utils';

class VaultMap {
  public readonly vaultMapPath: string;
  public readonly vaultMapDbPath: string;

  protected logger: Logger;
  protected fs: FileSystem;
  protected keyManager: KeyManager;
  protected vaultMapDb: LevelDB<string, Buffer>;
  protected vaultMapDbKey: Buffer;
  protected vaultMapDbPrefixer: (domain: string, key: string) => string;
  protected mapVaultsDb: LevelUp<
    AbstractLevelDOWN<VaultId, Buffer>,
    AbstractIterator<VaultId, Buffer>
  >;
  protected mapNamesDb: LevelUp<
    AbstractLevelDOWN<string, Buffer>,
    AbstractIterator<string, Buffer>
  >;
  protected mapLinksDb: LevelUp<
    AbstractLevelDOWN<VaultId, Buffer>,
    AbstractIterator<VaultId, Buffer>
  >;
  protected vaultMapDbMutex: Mutex = new Mutex();

  protected _transacting: boolean = false;
  protected _started: boolean = false;

  constructor({
    vaultMapPath,
    keyManager,
    fs,
    logger,
  }: {
    vaultMapPath: string;
    keyManager: KeyManager;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(this.constructor.name);
    this.fs = fs ?? require('fs');
    this.vaultMapPath = vaultMapPath;
    this.keyManager = keyManager;
    this.vaultMapDbPath = path.join(vaultMapPath, 'vault_db');
  }

  get started(): boolean {
    return this._started;
  }

  get transacting(): boolean {
    return this._transacting;
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
      this.logger.info('Starting Vault Map');
      this._started = true;
      if (!this.keyManager.started) {
        throw new keysErrors.ErrorKeyManagerNotStarted();
      }
      this.logger.info(`Setting Vault Map path to ${this.vaultMapPath}`);
      if (fresh) {
        await this.fs.promises.rm(this.vaultMapPath, {
          force: true,
          recursive: true,
        });
      }

      await utils.mkdirExists(this.fs, this.vaultMapPath, { recursive: true });

      const {
        p: vaultMapDbP,
        resolveP: resolveVaultMapDbP,
        rejectP: rejectVaultMapDbP,
      } = utils.promise<void>();
      const { p: vaultMapVaultsDbP, resolveP: resolveVaultMapVaultsDbP } =
        utils.promise<void>();
      const { p: vaultMapNamesDbP, resolveP: resolveVaultMapNamesDbP } =
        utils.promise<void>();
      const { p: vaultMapLinksDbP, resolveP: resolveVaultMapLinksDbP } =
        utils.promise<void>();

      const vaultMapDb = await level(
        this.vaultMapDbPath,
        { valueEncoding: 'binary' },
        (e) => {
          if (e) {
            rejectVaultMapDbP(e);
          } else {
            resolveVaultMapDbP();
          }
        },
      );
      const vaultMapDbKey = await this.setupVaultMapDbKey(bits);
      const vaultMapDbPrefixer = await sublevelprefixer('!');

      // vaults stores VaultId -> VaultKey
      const mapVaultsDb = subleveldown<VaultId, Buffer>(vaultMapDb, 'vaults', {
        valueEncoding: 'binary',
        open: (cb) => {
          cb(undefined);
          resolveVaultMapVaultsDbP();
        },
      });
      // names stores VaultName -> VaultId
      const mapNamesDb = subleveldown<string, Buffer>(vaultMapDb, 'names', {
        valueEncoding: 'binary',
        open: (cb) => {
          cb(undefined);
          resolveVaultMapNamesDbP();
        },
      });
      // links stores VaultId -> VaultLink
      const mapLinksDb = subleveldown<VaultId, Buffer>(vaultMapDb, 'links', {
        valueEncoding: 'binary',
        open: (cb) => {
          cb(undefined);
          resolveVaultMapLinksDbP();
        },
      });

      await Promise.all([
        vaultMapDbP,
        vaultMapVaultsDbP,
        vaultMapNamesDbP,
        vaultMapLinksDbP,
      ]);

      this.vaultMapDb = vaultMapDb;
      this.vaultMapDbKey = vaultMapDbKey;
      this.vaultMapDbPrefixer = vaultMapDbPrefixer;
      this.mapVaultsDb = mapVaultsDb;
      this.mapNamesDb = mapNamesDb;
      this.mapLinksDb = mapLinksDb;
      this.logger.info('Started Vault Map');
    } catch (e) {
      this._started = false;
      throw e;
    }
  }

  async stop() {
    if (!this._started) {
      return;
    }
    this.logger.info('Stopping Vault Map');
    this._started = false;
    await this.vaultMapDb.close();
    this.logger.info('Stopped Vault Map');
  }

  /**
   * Run several operations within the same lock
   * This does not ensure atomicity of the underlying database
   * Database atomicity still depends on the underlying operation
   */
  public async transaction<T>(
    f: (vaultMap: VaultMap) => Promise<T>,
  ): Promise<T> {
    const release = await this.vaultMapDbMutex.acquire();
    this._transacting = true;
    try {
      return await f(this);
    } finally {
      this._transacting = false;
      release();
    }
  }

  /**
   * Transaction wrapper that will not lock if the operation was executed
   * within a transaction context
   */
  protected async _transaction<T>(f: () => Promise<T>): Promise<T> {
    if (this._transacting) {
      return await f();
    } else {
      const release = await this.vaultMapDbMutex.acquire();
      try {
        return await f();
      } finally {
        release();
      }
    }
  }

  /**
   * Gets the vault id for a given vault name
   */
  public async getVaultIdByVaultName(
    vaultName: string,
  ): Promise<VaultId | undefined> {
    return await this._transaction(async () => {
      const vaultId = await this.getVaultMapDb('names', vaultName);
      if (vaultId == null) {
        return;
      }
      return vaultId.replace(/"/g, '') as VaultId;
    });
  }

  /**
   * Gets the vault lin for a given vault id
   */
  public async getVaultLinkByVaultId(
    vaultId: VaultId,
  ): Promise<string | undefined> {
    return await this._transaction(async () => {
      const vaultLink = await this.getVaultMapDb('links', vaultId);
      if (vaultLink == null) {
        return;
      }
      return vaultLink.replace(/"/g, '');
    });
  }

  /**
   * Renames an existing vault name to a new vault name
   * If the existing vault name doesn't exist, nothing will change
   */
  public async renameVault(
    vaultName: string,
    newVaultName: string,
  ): Promise<void> {
    await this._transaction(async () => {
      const vaultId = await this.getVaultMapDb('names', vaultName);
      if (!vaultId) {
        return;
      }
      const ops: Array<VaultMapOp> = [
        {
          type: 'del',
          domain: 'names',
          key: vaultName,
        },
        {
          type: 'put',
          domain: 'names',
          key: newVaultName,
          value: vaultId,
        },
      ];
      await this.batchVaultMapDb(ops);
    });
  }

  /**
   * Puts a new vault and the vault Id into the db
   */
  public async setVault(
    vaultName: string,
    vaultId: VaultId,
    vaultKey: Buffer,
  ): Promise<void> {
    await this._transaction(async () => {
      const existingId = await this.getVaultMapDb('names', vaultName);
      if (existingId) {
        throw new vaultErrors.ErrorVaultDefined(
          'Vault Name already exists in Polykey, specify a new Vault Name',
        );
      }
      const ops: Array<VaultMapOp> = [
        {
          type: 'put',
          domain: 'names',
          key: vaultName,
          value: vaultId,
        },
        {
          type: 'put',
          domain: 'vaults',
          key: vaultId,
          value: vaultKey,
        },
      ];
      await this.batchVaultMapDb(ops);
    });
  }

  /**
   * Puts a new vault and the vault Id into the db
   */
  public async setVaultLink(
    vaultId: VaultId,
    vaultLink: string,
  ): Promise<void> {
    await this._transaction(async () => {
      await this.putVaultMapDb('links', vaultId, vaultLink);
    });
  }

  /**
   * Deletes a vault using an existing vault name
   * If the existing vault name doesn't exist, nothing will change
   */
  public async delVault(vaultName: string): Promise<void> {
    await this._transaction(async () => {
      const vaultId = await this.getVaultMapDb('names', vaultName);
      if (vaultId == null) {
        return;
      }
      const ops: Array<VaultMapOp> = [
        {
          type: 'del',
          domain: 'names',
          key: vaultName,
        },
        {
          type: 'del',
          domain: 'vaults',
          key: vaultId,
        },
        {
          type: 'del',
          domain: 'links',
          key: vaultId,
        },
      ];
      await this.batchVaultMapDb(ops);
    });
  }

  protected async setupVaultMapDbKey(bits: number = 256): Promise<Buffer> {
    let trustDbKey = await this.keyManager.getKey(this.constructor.name);
    if (trustDbKey != null) {
      return trustDbKey;
    }
    this.logger.info('Generating Vault Map db key');
    trustDbKey = await keysUtils.generateKey(bits);
    await this.keyManager.putKey(this.constructor.name, trustDbKey);
    return trustDbKey;
  }

  protected async getVaultMapDb(
    domain: 'vaults',
    key: VaultId,
  ): Promise<Buffer | undefined>;
  protected async getVaultMapDb(
    domain: 'names',
    key: string,
  ): Promise<VaultId | undefined>;
  protected async getVaultMapDb(
    domain: 'links',
    key: VaultId,
  ): Promise<string | undefined>;
  protected async getVaultMapDb(domain: any, key: any): Promise<any> {
    if (!this._started) {
      throw new vaultErrors.ErrorVaultMapNotStarted();
    }
    let data: Buffer;
    try {
      data = await this.vaultMapDb.get(this.vaultMapDbPrefixer(domain, key));
    } catch (e) {
      if (e.notFound) {
        return undefined;
      }
      throw e;
    }
    return vaultUtils.unserializeDecrypt(this.vaultMapDbKey, data);
  }

  protected async putVaultMapDb(
    domain: 'vaults',
    key: VaultId,
    value: Buffer,
  ): Promise<void>;
  protected async putVaultMapDb(
    domain: 'names',
    key: string,
    value: VaultId,
  ): Promise<void>;
  protected async putVaultMapDb(
    domain: 'links',
    key: VaultId,
    value: string,
  ): Promise<void>;
  protected async putVaultMapDb(
    domain: any,
    key: any,
    value: any,
  ): Promise<void> {
    if (!this._started) {
      throw new vaultErrors.ErrorVaultMapNotStarted();
    }
    const data = vaultUtils.serializeEncrypt(this.vaultMapDbKey, value);
    await this.vaultMapDb.put(this.vaultMapDbPrefixer(domain, key), data);
  }

  protected async delVaultMapDb(domain: 'vaults', key: VaultId): Promise<void>;
  protected async delVaultMapDb(domain: 'names', key: string): Promise<void>;
  protected async delVaultMapDb(domain: 'links', key: VaultId): Promise<void>;
  protected async delVaultMapDb(domain: any, key: any): Promise<void> {
    if (!this._started) {
      throw new vaultErrors.ErrorVaultMapNotStarted();
    }
    await this.vaultMapDb.del(this.vaultMapDbPrefixer(domain, key));
  }

  /**
   * Load existing vaults data into memory from vault metadata path.
   * If metadata does not exist, does nothing.
   */
  public async loadVaultData(): Promise<Vaults> {
    const names = {};
    const vaults: Vaults = {};

    for await (const o of this.mapNamesDb.createReadStream({})) {
      const id = vaultUtils.unserializeDecrypt(
        this.vaultMapDbKey,
        (o as any).value,
      ) as string;
      const name = (o as any).key;
      names[id] = name;
    }
    for await (const o of this.mapVaultsDb.createReadStream({})) {
      const key = vaultUtils.unserializeDecrypt(
        this.vaultMapDbKey,
        (o as any).value,
      ) as Buffer;
      const id = (o as any).key;
      const name = names[id];
      const link = await this.getVaultLinkByVaultId(id as VaultId);

      vaults[id] = {
        vault: new Vault({
          vaultId: id,
          vaultName: name,
          key: Buffer.from(key),
          baseDir: this.vaultMapPath,
          logger: this.logger,
        }),
        vaultName: name,
        vaultKey: Buffer.from(key),
        vaultLink: link,
      };
    }
    return vaults;
  }

  protected async batchVaultMapDb(ops: Array<VaultMapOp>): Promise<void> {
    if (!this._started) {
      throw new vaultErrors.ErrorVaultMapNotStarted();
    }
    const ops_: Array<AbstractBatch> = [];
    for (const op of ops) {
      if (op.type === 'del') {
        ops_.push({
          type: op.type,
          key: this.vaultMapDbPrefixer(op.domain, op.key),
        });
      } else if (op.type === 'put') {
        const data = vaultUtils.serializeEncrypt(this.vaultMapDbKey, op.value);
        ops_.push({
          type: op.type,
          key: this.vaultMapDbPrefixer(op.domain, op.key),
          value: data,
        });
      }
    }
    await this.vaultMapDb.batch(ops_);
  }
}

export default VaultMap;
