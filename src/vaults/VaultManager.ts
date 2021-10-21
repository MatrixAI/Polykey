import type { DB, DBLevel, DBOp } from '@matrixai/db';
import type {
  VaultId,
  VaultName,
  VaultMap,
  VaultPermissions,
  VaultKey,
  VaultList,
  Vault,
} from './types';
import type { FileSystem } from '../types';
import type { WorkerManager } from '../workers';
import type { NodeId } from '../nodes/types';

import fs from 'fs';
import path from 'path';
import Logger from '@matrixai/logger';
import { Mutex, MutexInterface } from 'async-mutex';
import git from 'isomorphic-git';
import { PassThrough } from 'readable-stream';
import * as grpc from '@grpc/grpc-js';

import { KeyManager } from '../keys';
import { NodeManager } from '../nodes';
import { GestaltGraph } from '../gestalts';
import { ACL } from '../acl';
import { agentPB } from '../agent';

import * as utils from '../utils';
import * as vaultsUtils from './utils';
import * as vaultsErrors from './errors';
import * as keysErrors from '../keys/errors';
import * as gitUtils from '../git/utils';
import * as gitErrors from '../git/errors';
import * as nodesErrors from '../nodes/errors';
import * as aclErrors from '../acl/errors';
import * as gestaltErrors from '../gestalts/errors';
import { errors as dbErrors } from '@matrixai/db';
import { EncryptedFS, POJO } from 'encryptedfs';
import VaultInternal from './VaultInternal';
import { CreateDestroy, ready } from "@matrixai/async-init/dist/CreateDestroy";
import { utils as idUtils } from '@matrixai/id';
import { makeVaultId } from './utils';
import { NotificationsManager } from '../notifications';

interface VaultManager extends CreateDestroy {}
@CreateDestroy()
class VaultManager {
  public readonly vaultsPath: string;

  protected fs: FileSystem;
  protected nodeManager: NodeManager;
  protected gestaltGraph: GestaltGraph;
  protected acl: ACL;
  protected notificationsManager: NotificationsManager;
  protected efs: EncryptedFS;
  protected db: DB;
  protected logger: Logger;
  protected workerManager?: WorkerManager;
  protected vaultsKey: VaultKey;
  protected vaultsMap: VaultMap;
  protected vaultsDbDomain: string;
  protected vaultsNamesDbDomain: Array<string>;
  protected vaultsDb: DBLevel;
  protected vaultsNamesDb: DBLevel;
  protected keyManager: KeyManager;

  static async createVaultManager({
    fresh = false,
    keyManager,
    vaultsPath,
    vaultsKey,
    nodeManager,
    gestaltGraph,
    acl,
    db,
    fs,
    logger,
  }: {
    fresh?: boolean
    keyManager: KeyManager;
    vaultsPath: string;
    vaultsKey: VaultKey;
    nodeManager: NodeManager;
    gestaltGraph: GestaltGraph;
    acl: ACL;
    db: DB;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    logger = logger ?? new Logger(this.constructor.name);
    const fileSystem = fs ?? require('fs');
    logger.info('Creating Vault Manager');
    const vaultsDbDomain = 'VaultManager';
    const vaultsDb = await db.level(vaultsDbDomain);
    const vaultsNamesDbDomain = [vaultsDbDomain, 'names']
    const vaultsNamesDb = await db.level(
      vaultsNamesDbDomain[1],
      vaultsDb,
    );
    if (fresh) {
      await vaultsDb.clear();
      await fileSystem.promises.rm(vaultsPath, {
        force: true,
        recursive: true,
      });
      logger.info(`Removing vaults directory at '${vaultsPath}'`);
    }
    await utils.mkdirExists(fileSystem, vaultsPath, { recursive: true });
    const efs = await EncryptedFS.createEncryptedFS({
      dbPath: vaultsPath,
      dbKey: vaultsKey,
      logger: logger,
    });
    await efs.start();
    logger.info('Created Vault Manager');
    return new VaultManager({
      keyManager,
      nodeManager,
      gestaltGraph,
      acl,
      db,
      vaultsKey,
      vaultsDbDomain,
      vaultsNamesDbDomain,
      vaultsDb,
      vaultsNamesDb,
      efs,
      fs,
      logger,
    });
  }

  constructor({
    keyManager,
    nodeManager,
    gestaltGraph,
    acl,
    db,
    vaultsKey,
    vaultsDbDomain,
    vaultsNamesDbDomain,
    vaultsDb,
    vaultsNamesDb,
    efs,
    fs,
    logger,
  }: {
    keyManager: KeyManager;
    nodeManager: NodeManager;
    gestaltGraph: GestaltGraph;
    acl: ACL;
    db: DB;
    vaultsKey: VaultKey;
    vaultsDbDomain: string;
    vaultsNamesDbDomain: Array<string>;
    vaultsDb: DBLevel;
    vaultsNamesDb: DBLevel;
    efs: EncryptedFS;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.nodeManager = nodeManager;
    this.gestaltGraph = gestaltGraph;
    this.acl = acl;
    this.db = db;
    this.vaultsDbDomain = vaultsDbDomain;
    this.vaultsNamesDbDomain = vaultsNamesDbDomain;
    this.vaultsDb = vaultsDb;
    this.vaultsNamesDb = vaultsNamesDb;
    this.vaultsMap = new Map();
    this.efs = efs;
    this.fs = fs ?? require('fs');
    this.vaultsKey = vaultsKey;
    this.logger = logger ?? new Logger(this.constructor.name);
  }

  public async transaction<T>(
    f: (vaultManager: VaultManager) => Promise<T>,
    lock: MutexInterface
  ): Promise<T> {
    const release = await lock.acquire();
    try {
      return await f(this);
    } finally {
      release();
    }
  }

  protected async _transaction<T>(f: () => Promise<T>, vaults: Array<VaultId> = []): Promise<T> {
    const releases: Array<MutexInterface.Releaser> = [];
    for (const vault of vaults) {
        const lock = this.vaultsMap.get(idUtils.toString(vault));
        if (lock) releases.push(await lock.lock.acquire());
    }
    try {
        return await f();
    }
    finally {
      // Release them in the opposite order
      releases.reverse();
      for (const r of releases) {
          r();
      }
    }
  }

  public async destroy(): Promise<void> {
    this.logger.info('Destroying Vault Manager');
    // Destroying managed vaults.
    for (const vault of this.vaultsMap.values()) {
      await vault.vault?.destroy();
    }
    await this.efs.stop();
    this.logger.info('Destroyed Vault Manager');
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async getVaultName(
    vaultId: VaultId,
  ): Promise<VaultName | undefined> {
    const vaultMeta = await this.db.get<POJO>(
      this.vaultsNamesDbDomain,
      idUtils.toBuffer(vaultId),
    );
    if (vaultMeta == null) throw new vaultsErrors.ErrorVaultUndefined();
    return vaultMeta.name;
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async createVault(vaultName: VaultName): Promise<Vault> {
    const vaultId = await this.generateVaultId();
    const lock = new Mutex();
    this.vaultsMap.set(idUtils.toString(vaultId), { lock });
    return await this._transaction(async () => {
      await this.db.put(this.vaultsNamesDbDomain, idUtils.toBuffer(vaultId), { name: vaultName });
      const vault = await VaultInternal.create({
        vaultId,
        keyManager: this.keyManager,
        efs: this.efs,
        logger: this.logger.getChild(VaultInternal.name),
        fresh: true,
      });
      this.vaultsMap.set(idUtils.toString(vaultId), { lock, vault });
      return vault;
    }, [vaultId]);
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async destroyVault(vaultId: VaultId) {
    await this._transaction(async () => {
      const vaultName = await this.getVaultName(vaultId);
      if (!vaultName) return;
      await this.db.del(
        this.vaultsNamesDbDomain,
        idUtils.toBuffer(vaultId),
      );
      const a = this.vaultsMap.delete(idUtils.toString(vaultId));
      await this.efs.rmdir(vaultsUtils.makeVaultIdPretty(vaultId), { recursive: true });
    }, [vaultId]);
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async openVault(vaultId: VaultId): Promise<Vault> {
    const vaultName = await this.getVaultName(vaultId);
    if (!vaultName) throw new vaultsErrors.ErrorVaultUndefined();
    return await this.getVault(vaultId);
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async closeVault(vaultId: VaultId) {
    const vaultName = await this.getVaultName(vaultId);
    if (!vaultName) throw new vaultsErrors.ErrorVaultUndefined();
    const vault = await this.getVault(vaultId);
    await vault.destroy();
    this.vaultsMap.delete(idUtils.toString(vaultId));
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async listVaults(): Promise<VaultList> {
    const vaults: VaultList = new Map();
    for await (const o of this.vaultsNamesDb.createReadStream({})) {
      const dbMeta = (o as any).value;
      const dbId = (o as any).key;
      const vaultMeta = await this.db.deserializeDecrypt<POJO>(dbMeta, false);
      vaults.set(vaultMeta.name, makeVaultId(dbId));
    }
    return vaults;
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async renameVault(
    vaultId: VaultId,
    newVaultName: VaultName,
  ): Promise<void> {
    await this._transaction(async () => {
      const meta = await this.db.get<POJO>(this.vaultsNamesDbDomain, idUtils.toBuffer(vaultId));
      if (!meta) throw new vaultsErrors.ErrorVaultUndefined();
      meta.name = newVaultName;
      await this.db.put(this.vaultsNamesDbDomain, idUtils.toBuffer(vaultId), meta);
    }, [vaultId]);
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async getVaultId(vaultName: VaultName): Promise<VaultId | undefined> {
    for await (const o of this.vaultsNamesDb.createReadStream({})) {
      const dbMeta = (o as any).value;
      const dbId = (o as any).key;
      const vaultMeta = await this.db.deserializeDecrypt<POJO>(dbMeta, false);
      if (vaultName === vaultMeta.name) {
        return makeVaultId(dbId);
      }
    }
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async shareVault(vaultId: VaultId, nodeId: NodeId): Promise<void> {
    const vaultName = await this.getVaultName(vaultId);
    if (!vaultName) throw new vaultsErrors.ErrorVaultUndefined();
    return await this.gestaltGraph._transaction(async () => {
      return await this.acl._transaction(async () => {
        const gestalt = await this.gestaltGraph.getGestaltByNode(nodeId);
        if (gestalt == null) {
          throw new gestaltErrors.ErrorGestaltsGraphNodeIdMissing();
        }
        const nodes = gestalt.nodes;
        for (const node in nodes) {
          await this.acl.setNodeAction(nodeId, 'scan');
          await this.acl.setVaultAction(vaultId, nodes[node].id, 'pull');
          await this.acl.setVaultAction(vaultId, nodes[node].id, 'clone');
        }
        await this.notificationsManager.sendNotification(nodeId, {
          type: 'VaultShare',
          vaultId: idUtils.toString(vaultId),
          vaultName,
          actions: {
            clone: null,
            pull: null
          }
        });
      });
    });
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async cloneVault(nodeId: NodeId, vaultNameOrId: VaultId | VaultName): Promise<Vault> {
    let vaultName, remoteVaultId;
    const nodeConnection = await this.nodeManager.getConnectionToNode(nodeId);
    const client = nodeConnection.getClient();
    const vaultId = await this.generateVaultId();
    const lock = new Mutex();
    this.vaultsMap.set(idUtils.toString(vaultId), { lock });
    return await this._transaction(async () => {
      await this.efs.mkdir(path.join(vaultsUtils.makeVaultIdPretty(vaultId), 'contents'), { recursive: true });
      const request = async ({
          url,
          method = 'GET',
          headers = {},
          body = [Buffer.from('')],
      }: {
        url: string,
        method: string,
        headers: POJO,
        body: Buffer[],
      }) => {
        if (method === 'GET') {
          const infoResponse = {
            async *[Symbol.iterator] () {
              const request = new agentPB.InfoRequest();
              if (typeof vaultNameOrId === 'string') {
                request.setVaultId(vaultNameOrId);
              } else {
                request.setVaultId(idUtils.toString(vaultNameOrId));
              }
              const response = client.vaultsGitInfoGet(request);
              response.stream.on('metadata', async (meta) => {
                vaultName = meta.get('vaultName').pop()!.toString();
                remoteVaultId = makeVaultId(meta.get('vaultId').pop()!.toString());
              });
              for await (const resp of response) {
                yield resp.getChunk_asU8();
              }
            }
          }
          return {
            url: url,
            method: method,
            body: infoResponse,
            headers: headers,
            statusCode: 200,
            statusMessage: 'OK',
          };
        } else if (method === 'POST') {
          const packResponse = {
            async *[Symbol.iterator] () {
              const responseBuffers: Array<Buffer> = [];
              const meta = new grpc.Metadata();
              if (typeof vaultNameOrId === 'string') {
                meta.set('vaultNameOrId', vaultNameOrId);
              } else {
                meta.set('vaultNameOrId', vaultsUtils.makeVaultIdPretty(vaultNameOrId));
              }
              const stream = client.vaultsGitPackGet(meta);
              const write = utils.promisify(stream.write).bind(stream);
              stream.on('data', (d) => {
                responseBuffers.push(d.getChunk_asU8());
              });
              const chunk = new agentPB.PackChunk();
              chunk.setChunk(body[0]);
              write(chunk);
              stream.end();
              yield await new Promise<Uint8Array>((resolve) => {
                stream.once('end', () => {
                  resolve(Buffer.concat(responseBuffers));
                });
              });
            }
          }
          return {
            url: url,
            method: method,
            body: packResponse,
            headers: headers,
            statusCode: 200,
            statusMessage: 'OK',
          };
        } else {
          throw new Error('Method not supported');
        }
      }
      await git.clone({
        fs: this.efs,
        http: { request },
        dir: path.join(vaultsUtils.makeVaultIdPretty(vaultId), 'contents'),
        gitdir: path.join(vaultsUtils.makeVaultIdPretty(vaultId), '.git'),
        url: 'http://',
        singleBranch: true,
      });
      await this.efs.writeFile(
        path.join(vaultsUtils.makeVaultIdPretty(vaultId), '.git', 'packed-refs'),
        '# pack-refs with: peeled fully-peeled sorted',
      );
      const workingDir = (await git.log({
        fs: this.efs,
        dir: path.join(vaultsUtils.makeVaultIdPretty(vaultId), 'contents'),
        gitdir: path.join(vaultsUtils.makeVaultIdPretty(vaultId), '.git'),
        depth: 1,
      })).pop()!;
      await this.efs.writeFile(path.join(vaultsUtils.makeVaultIdPretty(vaultId), '.git', 'workingDir'), workingDir.oid);
      const vault = await VaultInternal.create({
        vaultId,
        keyManager: this.keyManager,
        efs: this.efs,
        logger: this.logger.getChild(VaultInternal.name),
      });
      this.vaultsMap.set(idUtils.toString(vaultId), { lock, vault });
      await this.db.put(this.vaultsNamesDbDomain, idUtils.toBuffer(vaultId), { name: vaultName, defaultPullNode: nodeId, defaultPullVault: idUtils.toBuffer(remoteVaultId) });
      return vault;
    }, [vaultId]);
  }

  public async pullVault({ vaultId, pullNodeId, pullVaultNameOrId }: { vaultId: VaultId, pullNodeId?: NodeId, pullVaultNameOrId?: VaultId | VaultName }): Promise<Vault> {
    let metaChange = 0;
    let vaultMeta, remoteVaultId;
    return await this._transaction(async () => {
      if (pullNodeId == null || pullVaultNameOrId == null) {
        vaultMeta = await this.db.get<POJO>(
          this.vaultsNamesDbDomain,
          idUtils.toBuffer(vaultId),
        );
        if (!vaultMeta) throw new vaultsErrors.ErrorVaultUnlinked();
        if (pullNodeId == null) {
          pullNodeId = vaultMeta.defaultPullNode;
        } else {
          metaChange = 1;
          vaultMeta.defaultPullNode = pullNodeId;
        }
        if (pullVaultNameOrId == null) {
          pullVaultNameOrId = makeVaultId(idUtils.fromBuffer(Buffer.from(vaultMeta.defaultPullVault.data)));
        } else {
          metaChange = 1;
          if (typeof pullVaultNameOrId === 'string') {
            metaChange = 2;
          } else {
            vaultMeta.defaultPullVault = idUtils.toBuffer(pullVaultNameOrId);
          }
        }
      }
      const nodeConnection = await this.nodeManager.getConnectionToNode(pullNodeId!);
      const client = nodeConnection.getClient();
      const request = async ({
        url,
        method = 'GET',
        headers = {},
        body = [Buffer.from('')],
      }: {
        url: string,
        method: string,
        headers: POJO,
        body: Buffer[],
      }) => {
        if (method === 'GET') {
          const infoResponse = {
            async *[Symbol.iterator] () {
              const request = new agentPB.InfoRequest();
              if (typeof pullVaultNameOrId === 'string') {
                request.setVaultId(pullVaultNameOrId);
              } else {
                request.setVaultId(idUtils.toString(pullVaultNameOrId!));
              }
              const response = client.vaultsGitInfoGet(request);
              response.stream.on('metadata', async (meta) => {
                remoteVaultId = makeVaultId(meta.get('vaultId').pop()!.toString());
              });
              for await (const resp of response) {
                yield resp.getChunk_asU8();
              }
            }
          }
          return {
            url: url,
            method: method,
            body: infoResponse,
            headers: headers,
            statusCode: 200,
            statusMessage: 'OK',
          };
        } else if (method === 'POST') {
          const packResponse = {
            async *[Symbol.iterator] () {
              const responseBuffers: Array<Buffer> = [];
              const meta = new grpc.Metadata();
              if (typeof pullVaultNameOrId === 'string') {
                meta.set('vaultNameOrId', pullVaultNameOrId);
              } else {
                meta.set('vaultNameOrId', vaultsUtils.makeVaultIdPretty(pullVaultNameOrId));
              }
              const stream = client.vaultsGitPackGet(meta);
              const write = utils.promisify(stream.write).bind(stream);
              stream.on('data', (d) => {
                responseBuffers.push(d.getChunk_asU8());
              });
              const chunk = new agentPB.PackChunk();
              chunk.setChunk(body[0]);
              write(chunk);
              stream.end();
              yield await new Promise<Uint8Array>((resolve) => {
                stream.once('end', () => {
                  resolve(Buffer.concat(responseBuffers));
                });
              });
            }
          }
          return {
            url: url,
            method: method,
            body: packResponse,
            headers: headers,
            statusCode: 200,
            statusMessage: 'OK',
          };
        } else {
          throw new Error('Method not supported');
        }
      }
      try {
        await git.pull({
          fs: this.efs,
          http: { request },
          dir: path.join(vaultsUtils.makeVaultIdPretty(vaultId), 'contents'),
          gitdir: path.join(vaultsUtils.makeVaultIdPretty(vaultId), '.git'),
          url: `http://`,
          ref: 'HEAD',
          singleBranch: true,
          author: {
            name: pullNodeId,
          },
        });
      } catch (err) {
        if (err instanceof git.Errors.MergeNotSupportedError) {
          throw new vaultsErrors.ErrorVaultMergeConflict(
            'Merge Conflicts are not supported yet',
          );
        }
        throw err;
      }
      if (metaChange !== 0) {
        if (metaChange === 2) vaultMeta.defaultPullVault = remoteVaultId;
        await this.db.put(
          this.vaultsNamesDbDomain,
          idUtils.toBuffer(vaultId),
          vaultMeta,
        );
      }
      const vault = await this.getVault(vaultId);
      await vault.readWorkingDirectory();
      return vault;
    }, [vaultId]);
  }

  protected async generateVaultId(): Promise<VaultId> {
    let vaultId = vaultsUtils.generateVaultId();
    let i = 0;
    while (await this.efs.exists(idUtils.toString(vaultId))) {
      i++;
      if (i > 50) {
        throw new vaultsErrors.ErrorCreateVaultId(
          'Could not create a unique vaultId after 50 attempts',
        );
      }
      vaultId = vaultsUtils.generateVaultId();
    }
    return vaultId;
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async *handleInfoRequest(vaultId: VaultId): AsyncGenerator<Buffer | null> {
    const service = 'upload-pack';
    yield Buffer.from(
      gitUtils.createGitPacketLine('# service=git-' + service + '\n'),
    );
    yield Buffer.from('0000');
    for (const buffer of (await gitUtils.uploadPack(this.efs, path.join(vaultsUtils.makeVaultIdPretty(vaultId), '.git'), true)) ??
      []) {
      yield buffer;
    }
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async handlePackRequest(vaultId: VaultId, body: Buffer): Promise<PassThrough[]> {
    if (body.toString().slice(4, 8) === 'want') {
      const wantedObjectId = body.toString().slice(9, 49);
      const packResult = await gitUtils.packObjects({
        fs: this.efs,
        gitdir: path.join(vaultsUtils.makeVaultIdPretty(vaultId), '.git'),
        refs: [wantedObjectId],
      });
      const readable = new PassThrough();
      const progressStream = new PassThrough();
      const sideBand = gitUtils.mux(
        'side-band-64',
        readable,
        packResult.packstream,
        progressStream,
      );
      return [sideBand, progressStream];
    } else {
      throw new gitErrors.ErrorGitUnimplementedMethod(
        `Request of type '${body
          .toString()
          .slice(4, 8)}' not valid, expected 'want'`,
      );
    }
  }

  protected async getVault(vaultId: VaultId): Promise<VaultInternal> {
    let vault: VaultInternal | undefined;
    let lock: MutexInterface;
    let vaultAndLock = this.vaultsMap.get(idUtils.toString(vaultId));
    if (vaultAndLock != null) {
      ({ vault, lock } = vaultAndLock);
      if (vault != null) {
        return vault;
      }
      let release;
      try {
        release = await lock.acquire();
        ({ vault, lock } = vaultAndLock);
        if (vault != null) {
          return vault;
        }
        vault = await VaultInternal.create({
          vaultId,
          keyManager: this.keyManager,
          efs: this.efs,
          logger: this.logger.getChild(VaultInternal.name),
        });
        vaultAndLock.vault = vault;
        this.vaultsMap.set(idUtils.toString(vaultId), vaultAndLock);
        return vault;
      } finally {
        release();
      }
    } else {
      lock = new Mutex();
      vaultAndLock = { lock };
      this.vaultsMap.set(idUtils.toString(vaultId), vaultAndLock);
      let release;
      try {
        release = await lock.acquire();
        vault = await VaultInternal.create({
          vaultId,
          keyManager: this.keyManager,
          efs: this.efs,
          logger: this.logger.getChild(VaultInternal.name),
        });
        vaultAndLock.vault = vault;
        this.vaultsMap.set(idUtils.toString(vaultId), vaultAndLock);
        return vault;
      } finally {
        release();
      }
    }
  }

  protected async getLock(vaultId: VaultId): Promise<MutexInterface> {
    const vaultLock = this.vaultsMap.get(idUtils.toString(vaultId));
    let lock = vaultLock?.lock;
    if (!lock) {
      lock = new Mutex();
      this.vaultsMap.set(idUtils.toString(vaultId), { lock });
    }
    return lock;
  }
}

export default VaultManager;
