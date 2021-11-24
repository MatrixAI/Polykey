import type { DB, DBLevel } from '@matrixai/db';
import type {
  VaultId,
  VaultName,
  VaultMap,
  VaultKey,
  VaultList,
  Vault,
} from './types';
import type { FileSystem } from '../types';
import type { NodeId } from '../nodes/types';
import type { PolykeyWorkerManagerInterface } from '../workers/types';

import type { MutexInterface } from 'async-mutex';
import type { POJO } from 'encryptedfs';
import type { KeyManager } from '../keys';
import type { NodeManager } from '../nodes';
import type { GestaltGraph } from '../gestalts';
import type { ACL } from '../acl';
import type { NotificationsManager } from '../notifications';
import path from 'path';
import Logger from '@matrixai/logger';
import { Mutex } from 'async-mutex';
import git from 'isomorphic-git';
import { PassThrough } from 'readable-stream';
import * as grpc from '@grpc/grpc-js';
import { EncryptedFS } from 'encryptedfs';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { utils as idUtils } from '@matrixai/id';
import * as vaultsUtils from './utils';
import * as vaultsErrors from './errors';
import VaultInternal from './VaultInternal';
import { makeVaultId } from './utils';
import * as vaultsPB from '../proto/js/polykey/v1/vaults/vaults_pb';
import * as utils from '../utils';
import * as gitUtils from '../git/utils';
import * as gitErrors from '../git/errors';
import * as gestaltErrors from '../gestalts/errors';

interface VaultManager extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new vaultsErrors.ErrorVaultManagerRunning(),
  new vaultsErrors.ErrorVaultManagerDestroyed(),
)
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
  protected vaultsKey: VaultKey;
  protected vaultsMap: VaultMap;
  protected vaultsDbDomain: string;
  protected vaultsNamesDbDomain: Array<string>;
  protected vaultsDb: DBLevel;
  protected vaultsNamesDb: DBLevel;
  protected keyManager: KeyManager;

  static async createVaultManager({
    vaultsPath,
    keyManager,
    nodeManager,
    gestaltGraph,
    acl,
    db,
    vaultsKey,
    fs = require('fs'),
    logger = new Logger(this.name),
    fresh = false,
  }: {
    vaultsPath: string;
    keyManager: KeyManager;
    nodeManager: NodeManager;
    gestaltGraph: GestaltGraph;
    acl: ACL;
    db: DB;
    vaultsKey: VaultKey;
    fs?: FileSystem;
    logger?: Logger;
    fresh?: boolean;
  }) {
    logger.info(`Creating ${this.name}`);
    const vaultManager = new VaultManager({
      vaultsPath,
      keyManager,
      nodeManager,
      gestaltGraph,
      acl,
      db,
      vaultsKey,
      fs,
      logger,
    });
    logger.info(`Created ${this.name}`);
    await vaultManager.start({ fresh });
    return vaultManager;
  }

  constructor({
    vaultsPath,
    keyManager,
    nodeManager,
    gestaltGraph,
    acl,
    db,
    vaultsKey,
    fs,
    logger,
  }: {
    vaultsPath: string;
    keyManager: KeyManager;
    nodeManager: NodeManager;
    gestaltGraph: GestaltGraph;
    acl: ACL;
    db: DB;
    vaultsKey: VaultKey;
    fs: FileSystem;
    logger: Logger;
  }) {
    this.vaultsPath = vaultsPath;
    this.keyManager = keyManager;
    this.nodeManager = nodeManager;
    this.gestaltGraph = gestaltGraph;
    this.acl = acl;
    this.db = db;
    this.vaultsMap = new Map();
    this.fs = fs;
    this.vaultsKey = vaultsKey;
    this.logger = logger;
  }

  public async start({
    fresh = false,
  }: { fresh?: boolean } = {}): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    this.vaultsDbDomain = 'VaultManager';
    this.vaultsDb = await this.db.level(this.vaultsDbDomain);
    this.vaultsNamesDbDomain = [this.vaultsDbDomain, 'names'];
    this.vaultsNamesDb = await this.db.level(
      this.vaultsNamesDbDomain[1],
      this.vaultsDb,
    );
    if (fresh) {
      await this.vaultsDb.clear();
      await this.fs.promises.rm(this.vaultsPath, {
        force: true,
        recursive: true,
      });
      this.logger.info(`Removing vaults directory at '${this.vaultsPath}'`);
    }
    await utils.mkdirExists(this.fs, this.vaultsPath);
    this.efs = await EncryptedFS.createEncryptedFS({
      dbPath: this.vaultsPath,
      dbKey: this.vaultsKey,
      logger: this.logger,
    });
    await this.efs.start();
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop(): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    // Destroying managed vaults.
    for (const vault of this.vaultsMap.values()) {
      await vault.vault?.destroy();
    }
    await this.efs.stop();
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy(): Promise<void> {
    this.logger.info(`Destroying ${this.constructor.name}`);
    // We want to remove any state for the vault manager.
    // this includes clearing out all DB domains and destroying the EFS.
    const vaultsDb = await this.db.level(this.vaultsDbDomain);
    await vaultsDb.clear();
    await this.efs.destroy();
    this.logger.info(`Removing vaults directory at '${this.vaultsPath}'`);
    await this.fs.promises.rm(this.vaultsPath, {
      force: true,
      recursive: true,
    });
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  public setWorkerManager(workerManager: PolykeyWorkerManagerInterface) {
    this.efs.setWorkerManager(workerManager);
  }

  public unsetWorkerManager() {
    this.efs.unsetWorkerManager();
  }

  public async transaction<T>(
    f: (vaultManager: VaultManager) => Promise<T>,
    lock: MutexInterface,
  ): Promise<T> {
    const release = await lock.acquire();
    try {
      return await f(this);
    } finally {
      release();
    }
  }

  protected async _transaction<T>(
    f: () => Promise<T>,
    vaults: Array<VaultId> = [],
  ): Promise<T> {
    const releases: Array<MutexInterface.Releaser> = [];
    for (const vault of vaults) {
      const lock = this.vaultsMap.get(idUtils.toString(vault));
      if (lock) releases.push(await lock.lock.acquire());
    }
    try {
      return await f();
    } finally {
      // Release them in the opposite order
      releases.reverse();
      for (const r of releases) {
        r();
      }
    }
  }

  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async getVaultName(vaultId: VaultId): Promise<VaultName | undefined> {
    const vaultMeta = await this.db.get<POJO>(
      this.vaultsNamesDbDomain,
      idUtils.toBuffer(vaultId),
    );
    if (vaultMeta == null) throw new vaultsErrors.ErrorVaultUndefined();
    return vaultMeta.name;
  }

  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async createVault(vaultName: VaultName): Promise<Vault> {
    const vaultId = await this.generateVaultId();
    const lock = new Mutex();
    this.vaultsMap.set(idUtils.toString(vaultId), { lock });
    return await this._transaction(async () => {
      await this.db.put(this.vaultsNamesDbDomain, idUtils.toBuffer(vaultId), {
        name: vaultName,
      });
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

  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async destroyVault(vaultId: VaultId) {
    await this._transaction(async () => {
      const vaultName = await this.getVaultName(vaultId);
      if (!vaultName) return;
      await this.db.del(this.vaultsNamesDbDomain, idUtils.toBuffer(vaultId));
      this.vaultsMap.delete(idUtils.toString(vaultId));
      await this.efs.rmdir(vaultsUtils.makeVaultIdPretty(vaultId), {
        recursive: true,
      });
    }, [vaultId]);
  }

  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async openVault(vaultId: VaultId): Promise<Vault> {
    const vaultName = await this.getVaultName(vaultId);
    if (!vaultName) throw new vaultsErrors.ErrorVaultUndefined();
    return await this.getVault(vaultId);
  }

  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async closeVault(vaultId: VaultId) {
    const vaultName = await this.getVaultName(vaultId);
    if (!vaultName) throw new vaultsErrors.ErrorVaultUndefined();
    const vault = await this.getVault(vaultId);
    await vault.destroy();
    this.vaultsMap.delete(idUtils.toString(vaultId));
  }

  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
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

  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async renameVault(
    vaultId: VaultId,
    newVaultName: VaultName,
  ): Promise<void> {
    await this._transaction(async () => {
      const meta = await this.db.get<POJO>(
        this.vaultsNamesDbDomain,
        idUtils.toBuffer(vaultId),
      );
      if (!meta) throw new vaultsErrors.ErrorVaultUndefined();
      meta.name = newVaultName;
      await this.db.put(
        this.vaultsNamesDbDomain,
        idUtils.toBuffer(vaultId),
        meta,
      );
    }, [vaultId]);
  }

  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
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

  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
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
            pull: null,
          },
        });
      });
    });
  }

  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async cloneVault(
    nodeId: NodeId,
    vaultNameOrId: VaultId | VaultName,
  ): Promise<Vault> {
    let vaultName, remoteVaultId;
    const nodeConnection = await this.nodeManager.getConnectionToNode(nodeId);
    const client = nodeConnection.getClient();
    const vaultId = await this.generateVaultId();
    const lock = new Mutex();
    this.vaultsMap.set(idUtils.toString(vaultId), { lock });
    return await this._transaction(async () => {
      await this.efs.mkdir(
        path.join(vaultsUtils.makeVaultIdPretty(vaultId), 'contents'),
        { recursive: true },
      );
      const request = async ({
        url,
        method = 'GET',
        headers = {},
        body = [Buffer.from('')],
      }: {
        url: string;
        method: string;
        headers: POJO;
        body: Buffer[];
      }) => {
        if (method === 'GET') {
          const infoResponse = {
            async *[Symbol.iterator]() {
              const request = new vaultsPB.Vault();
              if (typeof vaultNameOrId === 'string') {
                request.setNameOrId(vaultNameOrId);
              } else {
                request.setNameOrId(idUtils.toString(vaultNameOrId));
              }
              const response = client.vaultsGitInfoGet(request);
              response.stream.on('metadata', async (meta) => {
                vaultName = meta.get('vaultName').pop()!.toString();
                remoteVaultId = makeVaultId(
                  meta.get('vaultId').pop()!.toString(),
                );
              });
              for await (const resp of response) {
                yield resp.getChunk_asU8();
              }
            },
          };
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
            async *[Symbol.iterator]() {
              const responseBuffers: Array<Buffer> = [];
              const meta = new grpc.Metadata();
              if (typeof vaultNameOrId === 'string') {
                meta.set('vaultNameOrId', vaultNameOrId);
              } else {
                meta.set(
                  'vaultNameOrId',
                  vaultsUtils.makeVaultIdPretty(vaultNameOrId),
                );
              }
              const stream = client.vaultsGitPackGet(meta);
              const write = utils.promisify(stream.write).bind(stream);
              stream.on('data', (d) => {
                responseBuffers.push(d.getChunk_asU8());
              });
              const chunk = new vaultsPB.PackChunk();
              chunk.setChunk(body[0]);
              write(chunk);
              stream.end();
              yield await new Promise<Uint8Array>((resolve) => {
                stream.once('end', () => {
                  resolve(Buffer.concat(responseBuffers));
                });
              });
            },
          };
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
      };
      await git.clone({
        fs: this.efs,
        http: { request },
        dir: path.join(vaultsUtils.makeVaultIdPretty(vaultId), 'contents'),
        gitdir: path.join(vaultsUtils.makeVaultIdPretty(vaultId), '.git'),
        url: 'http://',
        singleBranch: true,
      });
      await this.efs.writeFile(
        path.join(
          vaultsUtils.makeVaultIdPretty(vaultId),
          '.git',
          'packed-refs',
        ),
        '# pack-refs with: peeled fully-peeled sorted',
      );
      const workingDir = (
        await git.log({
          fs: this.efs,
          dir: path.join(vaultsUtils.makeVaultIdPretty(vaultId), 'contents'),
          gitdir: path.join(vaultsUtils.makeVaultIdPretty(vaultId), '.git'),
          depth: 1,
        })
      ).pop()!;
      await this.efs.writeFile(
        path.join(vaultsUtils.makeVaultIdPretty(vaultId), '.git', 'workingDir'),
        workingDir.oid,
      );
      const vault = await VaultInternal.create({
        vaultId,
        keyManager: this.keyManager,
        efs: this.efs,
        logger: this.logger.getChild(VaultInternal.name),
      });
      this.vaultsMap.set(idUtils.toString(vaultId), { lock, vault });
      await this.db.put(this.vaultsNamesDbDomain, idUtils.toBuffer(vaultId), {
        name: vaultName,
        defaultPullNode: nodeId,
        defaultPullVault: idUtils.toBuffer(remoteVaultId),
      });
      return vault;
    }, [vaultId]);
  }

  public async pullVault({
    vaultId,
    pullNodeId,
    pullVaultNameOrId,
  }: {
    vaultId: VaultId;
    pullNodeId?: NodeId;
    pullVaultNameOrId?: VaultId | VaultName;
  }): Promise<Vault> {
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
          pullVaultNameOrId = makeVaultId(
            idUtils.fromBuffer(Buffer.from(vaultMeta.defaultPullVault.data)),
          );
        } else {
          metaChange = 1;
          if (typeof pullVaultNameOrId === 'string') {
            metaChange = 2;
          } else {
            vaultMeta.defaultPullVault = idUtils.toBuffer(pullVaultNameOrId);
          }
        }
      }
      const nodeConnection = await this.nodeManager.getConnectionToNode(
        pullNodeId!,
      );
      const client = nodeConnection.getClient();
      const request = async ({
        url,
        method = 'GET',
        headers = {},
        body = [Buffer.from('')],
      }: {
        url: string;
        method: string;
        headers: POJO;
        body: Buffer[];
      }) => {
        if (method === 'GET') {
          const infoResponse = {
            async *[Symbol.iterator]() {
              const request = new vaultsPB.Vault();
              if (typeof pullVaultNameOrId === 'string') {
                request.setNameOrId(pullVaultNameOrId);
              } else {
                request.setNameOrId(idUtils.toString(pullVaultNameOrId!));
              }
              const response = client.vaultsGitInfoGet(request);
              response.stream.on('metadata', async (meta) => {
                remoteVaultId = makeVaultId(
                  meta.get('vaultId').pop()!.toString(),
                );
              });
              for await (const resp of response) {
                yield resp.getChunk_asU8();
              }
            },
          };
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
            async *[Symbol.iterator]() {
              const responseBuffers: Array<Buffer> = [];
              const meta = new grpc.Metadata();
              if (typeof pullVaultNameOrId === 'string') {
                meta.set('vaultNameOrId', pullVaultNameOrId);
              } else {
                meta.set(
                  'vaultNameOrId',
                  vaultsUtils.makeVaultIdPretty(pullVaultNameOrId),
                );
              }
              const stream = client.vaultsGitPackGet(meta);
              const write = utils.promisify(stream.write).bind(stream);
              stream.on('data', (d) => {
                responseBuffers.push(d.getChunk_asU8());
              });
              const chunk = new vaultsPB.PackChunk();
              chunk.setChunk(body[0]);
              write(chunk);
              stream.end();
              yield await new Promise<Uint8Array>((resolve) => {
                stream.once('end', () => {
                  resolve(Buffer.concat(responseBuffers));
                });
              });
            },
          };
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
      };
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

  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async *handleInfoRequest(
    vaultId: VaultId,
  ): AsyncGenerator<Buffer | null> {
    const service = 'upload-pack';
    yield Buffer.from(
      gitUtils.createGitPacketLine('# service=git-' + service + '\n'),
    );
    yield Buffer.from('0000');
    for (const buffer of (await gitUtils.uploadPack(
      this.efs,
      path.join(vaultsUtils.makeVaultIdPretty(vaultId), '.git'),
      true,
    )) ?? []) {
      yield buffer;
    }
  }

  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async handlePackRequest(
    vaultId: VaultId,
    body: Buffer,
  ): Promise<PassThrough[]> {
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
