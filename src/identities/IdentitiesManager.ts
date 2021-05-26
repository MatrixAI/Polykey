import type { LevelDB } from 'level';
import type {
  ProviderId,
  IdentityId,
  ProviderTokens,
  TokenData,
} from './types';
import type { FileSystem } from '../types';
import type { KeyManager } from '../keys';
import type Provider from './Provider';

import path from 'path';
import level from 'level';
import { Mutex } from 'async-mutex';
import Logger from '@matrixai/logger';
import * as identitiesUtils from './utils';
import * as identitiesErrors from './errors';
import { utils as keysUtils, errors as keysErrors } from '../keys';
import * as utils from '../utils';

class IdentitiesManager {
  public readonly identitiesPath: string;
  public readonly tokenDbPath: string;

  protected logger: Logger;
  protected fs: FileSystem;
  protected keyManager: KeyManager;
  protected tokenDb: LevelDB<ProviderId, Buffer>;
  protected tokenDbKey: Buffer;
  protected tokenDbMutex: Mutex = new Mutex();
  protected providers: Map<ProviderId, Provider> = new Map();
  protected _started: boolean = false;

  constructor({
    identitiesPath,
    keyManager,
    fs,
    logger,
  }: {
    identitiesPath: string;
    keyManager: KeyManager;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(this.constructor.name);
    this.fs = fs ?? require('fs');
    this.identitiesPath = identitiesPath;
    this.keyManager = keyManager;
    this.tokenDbPath = path.join(identitiesPath, 'token_db');
  }

  get started(): boolean {
    return this._started;
  }

  async start({
    bits = 256,
    fresh = false,
  }: {
    bits?: number;
    fresh?: boolean;
  } = {}) {
    this.logger.info('Starting Identities Manager');
    if (!this.keyManager.started) {
      throw new keysErrors.ErrorKeyManagerNotStarted();
    }
    this.logger.info(`Setting identities path to ${this.identitiesPath}`);
    if (fresh) {
      await this.fs.promises.rm(this.identitiesPath, {
        force: true,
        recursive: true,
      });
      this.providers = new Map();
    }
    await utils.mkdirExists(this.fs, this.identitiesPath);
    const tokenDbKey = await this.setupTokenDbKey(bits);
    const tokenDb = await level(this.tokenDbPath, { valueEncoding: 'binary' });
    this.tokenDb = tokenDb;
    this.tokenDbKey = tokenDbKey;
    this._started = true;
    this.logger.info('Started Identities Manager');
  }

  async stop() {
    this.logger.info('Stopping Identities Manager');
    if (this._started) {
      this.tokenDb.close();
    }
    this._started = false;
    this.logger.info('Stopped Identities Manager');
  }

  public getProviders(): Record<ProviderId, Provider> {
    return Object.fromEntries(this.providers);
  }

  public getProvider(pId: ProviderId): Provider | undefined {
    return this.providers.get(pId);
  }

  public registerProvider(p: Provider): void {
    if (this.providers.has(p.id)) {
      throw new identitiesErrors.ErrorProviderDuplicate();
    }
    p.setTokenDb(
      () => this.getTokens(p.id),
      (identityId) => this.getToken(p.id, identityId),
      (identityId, tokenValue) => this.putToken(p.id, identityId, tokenValue),
      (identityId) => this.delToken(p.id, identityId),
    );
    this.providers.set(p.id, p);
  }

  public unregisterProvider(pId: ProviderId): void {
    this.providers.delete(pId);
  }

  public async getTokens(providerId: ProviderId): Promise<ProviderTokens> {
    if (!this._started) {
      throw new identitiesErrors.ErrorIdentitiesManagerNotStarted();
    }
    let data: Buffer;
    try {
      data = await this.tokenDb.get(providerId);
    } catch (e) {
      if (e.notFound) {
        return {};
      }
      throw e;
    }
    return identitiesUtils.unserializeProviderTokens(this.tokenDbKey, data);
  }

  public async getToken(
    providerId: ProviderId,
    identityId: IdentityId,
  ): Promise<TokenData | undefined> {
    if (!this._started) {
      throw new identitiesErrors.ErrorIdentitiesManagerNotStarted();
    }
    let data: Buffer;
    try {
      data = await this.tokenDb.get(providerId);
    } catch (e) {
      if (e.notFound) {
        return undefined;
      }
      throw e;
    }
    const providerTokens = identitiesUtils.unserializeProviderTokens(
      this.tokenDbKey,
      data,
    );
    return providerTokens[identityId];
  }

  public async putToken(
    providerId: ProviderId,
    identityId: IdentityId,
    tokenData: TokenData,
  ): Promise<void> {
    if (!this._started) {
      throw new identitiesErrors.ErrorIdentitiesManagerNotStarted();
    }
    const release = await this.tokenDbMutex.acquire();
    try {
      const providerTokens: ProviderTokens =
        (await this.getToken(providerId, identityId)) ?? {};
      providerTokens[identityId] = tokenData;
      const data = identitiesUtils.serializeProviderTokens(
        this.tokenDbKey,
        providerTokens,
      );
      await this.tokenDb.put(providerId, data);
    } finally {
      release();
    }
  }

  public async delToken(
    providerId: ProviderId,
    identityId: IdentityId,
  ): Promise<void> {
    if (!this._started) {
      throw new identitiesErrors.ErrorIdentitiesManagerNotStarted();
    }
    const release = await this.tokenDbMutex.acquire();
    try {
      const providerTokens = await this.getToken(providerId, identityId);
      if (!providerTokens) {
        return;
      }
      delete providerTokens[identityId];
      if (!Object.keys(providerTokens).length) {
        await this.tokenDb.del(providerId);
        return;
      }
      const data = identitiesUtils.serializeProviderTokens(
        this.tokenDbKey,
        providerTokens,
      );
      await this.tokenDb.put(providerId, data);
    } finally {
      release();
    }
  }

  protected async setupTokenDbKey(bits: number = 256): Promise<Buffer> {
    let tokenDbKey = await this.keyManager.getKey(this.constructor.name);
    if (tokenDbKey != null) {
      return tokenDbKey;
    }
    this.logger.info('Generating token db key');
    tokenDbKey = await keysUtils.generateKey(bits);
    await this.keyManager.putKey(this.constructor.name, tokenDbKey);
    return tokenDbKey;
  }
}

export default IdentitiesManager;
