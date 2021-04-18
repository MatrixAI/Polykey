import type { Buffer } from 'buffer';
import type { AbstractBatch } from 'abstract-leveldown';
import type { LevelDB } from 'level';
import type {
  GestaltGraphDomain,
  GestaltGraphKey,
  GestaltKey,
  GestaltGraphValue,
  GestaltKeySet,
  GestaltGraphOp,
  Gestalt,
} from './types';
import type { FileSystem } from '../types';
import type { NodeId, NodeInfo } from '../nodes/types';
import type { ProviderId, IdentityId, IdentityInfo } from '../identities/types';
import type { KeyManager } from '../keys';

import path from 'path';
import level from 'level';
import { Mutex } from 'async-mutex';
import Logger from '@matrixai/logger';
import * as gestaltsUtils from './utils';
import * as gestaltsErrors from './errors';
import { utils as keysUtils, errors as keysErrors } from '../keys';
import * as utils from '../utils';

class GestaltGraph {
  public readonly gestaltsPath: string;
  public readonly graphDbPath: string;

  protected logger: Logger;
  protected fs: FileSystem;
  protected keyManager: KeyManager;
  protected graphDb: LevelDB<GestaltGraphKey, Buffer>;
  protected graphDbKey: Buffer;
  protected graphDbMutex: Mutex = new Mutex();
  protected _started: boolean = false;

  constructor({
    gestaltsPath,
    keyManager,
    fs,
    logger,
  }: {
    gestaltsPath: string;
    keyManager: KeyManager;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(this.constructor.name);
    this.fs = fs ?? require('fs/promises');
    this.gestaltsPath = gestaltsPath;
    this.keyManager = keyManager;
    this.graphDbPath = path.join(gestaltsPath, 'graph_db');
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
    this.logger.info('Starting Gestalt Graph');
    if (!this.keyManager.started) {
      throw new keysErrors.ErrorKeyManagerNotStarted();
    }
    this.logger.info(`Setting gestalts path to ${this.gestaltsPath}`);
    if (fresh) {
      await this.fs.rm(this.gestaltsPath, {
        force: true,
        recursive: true,
      });
    }
    await utils.mkdirExists(this.fs, this.gestaltsPath);
    const graphDbKey = await this.setupGraphDbKey(bits);
    const graphDb = await level(this.graphDbPath, { valueEncoding: 'binary' });
    this.graphDb = graphDb;
    this.graphDbKey = graphDbKey;
    this._started = true;
    this.logger.info('Started Gestalts Graph');
  }

  async stop() {
    this.logger.info('Stopping Gestalt Graph');
    if (this._started) {
      this.graphDb.close();
    }
    this._started = false;
    this.logger.info('Stopped Gestalt Graph');
  }

  public async getGestalts(): Promise<Array<Gestalt>> {
    const release = await this.graphDbMutex.acquire();
    try {
      const unvisited: Map<GestaltKey, GestaltKeySet> = new Map();
      for await (const o of this.graphDb.createReadStream({
        gt: 'matrix',
        lt: 'nodes',
      })) {
        const ggK = (o as any).key;
        const data = (o as any).value;
        const [, gK] = gestaltsUtils.ungestaltGraphKey(ggK as GestaltGraphKey);
        const ggV = gestaltsUtils.unserializeGraphValue(this.graphDbKey, data);
        unvisited.set(gK, ggV);
      }
      const gestalts: Array<Gestalt> = [];
      let gestalt: Gestalt;
      for (const [gK, ggV] of unvisited) {
        gestalt = {
          matrix: {},
          nodes: {},
          identities: {},
        };
        const queue = [gK];
        while (true) {
          const vertex = queue.shift();
          if (!vertex) {
            gestalts.push(gestalt);
            break;
          }
          const gId = gestaltsUtils.ungestaltKey(vertex);
          const vertexKeys = ggV;
          gestalt.matrix[vertex] = vertexKeys;
          if (gId.type === 'node') {
            const nodeInfo = await this.getGraphDb('nodes', vertex);
            gestalt.nodes[vertex] = nodeInfo!;
          } else if (gId.type === 'identity') {
            const identityInfo = await this.getGraphDb('identities', vertex);
            gestalt.identities[vertex] = identityInfo!;
          }
          unvisited.delete(vertex);
          const neighbours: Array<GestaltKey> = Object.keys(
            vertexKeys,
          ).filter((k: GestaltKey) => unvisited.has(k)) as Array<GestaltKey>;
          queue.push(...neighbours);
        }
      }
      return gestalts;
    } finally {
      release();
    }
  }

  public async getGestaltByNode(nodeId: NodeId): Promise<Gestalt | undefined> {
    const nodeKey = gestaltsUtils.keyFromNode(nodeId);
    return this.getGestaltByKey(nodeKey);
  }

  public async getGestaltByIdentity(
    providerId: ProviderId,
    identityId: IdentityId,
  ): Promise<Gestalt | undefined> {
    const identityKey = gestaltsUtils.keyFromIdentity(providerId, identityId);
    return this.getGestaltByKey(identityKey);
  }

  public async setIdentity(identityInfo: IdentityInfo): Promise<void> {
    const release = await this.graphDbMutex.acquire();
    try {
      const ops = await this.setIdentityOps(identityInfo);
      await this.batchGraphDb(ops);
    } finally {
      release();
    }
  }

  public async unsetIdentity(providerId: ProviderId, identityId: IdentityId) {
    const release = await this.graphDbMutex.acquire();
    try {
      const ops = await this.unsetIdentityOps(providerId, identityId);
      await this.batchGraphDb(ops);
    } finally {
      release();
    }
  }

  public async setNode(nodeInfo: NodeInfo): Promise<void> {
    const release = await this.graphDbMutex.acquire();
    try {
      const ops = await this.setNodeOps(nodeInfo);
      await this.batchGraphDb(ops);
    } finally {
      release();
    }
  }

  public async unsetNode(nodeId: NodeId): Promise<void> {
    const release = await this.graphDbMutex.acquire();
    try {
      const ops = await this.unsetNodeOps(nodeId);
      await this.batchGraphDb(ops);
    } finally {
      release();
    }
  }

  public async linkNodeAndIdentity(
    nodeInfo: NodeInfo,
    identityInfo: IdentityInfo,
  ): Promise<void> {
    const release = await this.graphDbMutex.acquire();
    try {
      const ops = await this.linkNodeAndIdentityOps(nodeInfo, identityInfo);
      await this.batchGraphDb(ops);
    } finally {
      release();
    }
  }

  public async unlinkNodeAndIdentity(
    nodeId: NodeId,
    providerId: ProviderId,
    identityId: IdentityId,
  ): Promise<void> {
    const release = await this.graphDbMutex.acquire();
    try {
      const ops = await this.unlinkNodeAndIdentityOps(
        nodeId,
        providerId,
        identityId,
      );
      await this.batchGraphDb(ops);
    } finally {
      release();
    }
  }

  public async linkNodeAndNode(
    nodeInfo1: NodeInfo,
    nodeInfo2: NodeInfo,
  ): Promise<void> {
    const release = await this.graphDbMutex.acquire();
    try {
      const ops = await this.linkNodeAndNodeOps(nodeInfo1, nodeInfo2);
      await this.batchGraphDb(ops);
    } finally {
      release();
    }
  }

  public async unlinkNodeAndNode(
    nodeId1: NodeId,
    nodeId2: NodeId,
  ): Promise<void> {
    const release = await this.graphDbMutex.acquire();
    try {
      const ops = await this.unlinkNodeAndNodeOps(nodeId1, nodeId2);
      await this.batchGraphDb(ops);
    } finally {
      release();
    }
  }

  protected async setupGraphDbKey(bits: number = 256): Promise<Buffer> {
    let graphDbKey = await this.keyManager.getKey(this.constructor.name);
    if (graphDbKey != null) {
      return graphDbKey;
    }
    this.logger.info('Generating graph db key');
    graphDbKey = await keysUtils.generateKey(bits);
    await this.keyManager.putKey(this.constructor.name, graphDbKey);
    return graphDbKey;
  }

  protected async getGestaltByKey(
    gK: GestaltKey,
  ): Promise<Gestalt | undefined> {
    const release = await this.graphDbMutex.acquire();
    try {
      const gestalt: Gestalt = {
        matrix: {},
        nodes: {},
        identities: {},
      };
      const queue = [gK];
      const visited = new Set<GestaltKey>();
      while (true) {
        const vertex = queue.shift();
        if (!vertex) {
          break;
        }
        const gId = gestaltsUtils.ungestaltKey(vertex);
        const vertexKeys = await this.getGraphDb('matrix', vertex);
        if (!vertexKeys) {
          return;
        }
        gestalt.matrix[vertex] = vertexKeys;
        if (gId.type === 'node') {
          const nodeInfo = await this.getGraphDb('nodes', vertex);
          gestalt.nodes[vertex] = nodeInfo!;
        } else if (gId.type === 'identity') {
          const identityInfo = await this.getGraphDb('identities', vertex);
          gestalt.identities[vertex] = identityInfo!;
        }
        visited.add(vertex);
        const neighbours: Array<GestaltKey> = Object.keys(vertexKeys).filter(
          (k: GestaltKey) => !visited.has(k),
        ) as Array<GestaltKey>;
        queue.push(...neighbours);
      }
      return gestalt;
    } finally {
      release();
    }
  }

  protected async setNodeOps(
    nodeInfo: NodeInfo,
  ): Promise<Array<GestaltGraphOp>> {
    const nodeKey = gestaltsUtils.keyFromNode(nodeInfo.id);
    const nodeKeyKeys = (await this.getGraphDb('matrix', nodeKey)) || {};
    const ops: Array<GestaltGraphOp> = [
      {
        type: 'put',
        domain: 'matrix',
        key: nodeKey,
        value: nodeKeyKeys,
      },
      {
        type: 'put',
        domain: 'nodes',
        key: nodeKey,
        value: nodeInfo,
      },
    ];
    return ops;
  }

  protected async unsetNodeOps(nodeId: NodeId): Promise<Array<GestaltGraphOp>> {
    const nodeKey = gestaltsUtils.keyFromNode(nodeId);
    const nodeKeyKeys = await this.getGraphDb('matrix', nodeKey);
    let ops: Array<GestaltGraphOp> = [];
    if (!nodeKeyKeys) {
      return ops;
    }
    ops = [
      {
        type: 'del',
        domain: 'nodes',
        key: nodeKey,
      },
    ];
    for (const key of Object.keys(nodeKeyKeys) as Array<GestaltKey>) {
      const gId = gestaltsUtils.ungestaltKey(key);
      if (gId.type === 'node') {
        ops.push(...(await this.unlinkNodeAndNodeOps(nodeId, gId.nodeId)));
      } else if (gId.type === 'identity') {
        ops.push(
          ...(await this.unlinkNodeAndIdentityOps(
            nodeId,
            gId.providerId,
            gId.identityId,
          )),
        );
      }
    }
    // ensure that an empty key set is still deleted
    ops.push({
      type: 'del',
      domain: 'matrix',
      key: nodeKey,
    });
    return ops;
  }

  protected async setIdentityOps(
    identityInfo: IdentityInfo,
  ): Promise<Array<GestaltGraphOp>> {
    const identityKey = gestaltsUtils.keyFromIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    const identityKeyKeys =
      (await this.getGraphDb('matrix', identityKey)) || {};
    const ops: Array<GestaltGraphOp> = [
      {
        type: 'put',
        domain: 'matrix',
        key: identityKey,
        value: identityKeyKeys,
      },
      {
        type: 'put',
        domain: 'identities',
        key: identityKey,
        value: identityInfo,
      },
    ];
    return ops;
  }

  protected async unsetIdentityOps(
    providerId: ProviderId,
    identityId: IdentityId,
  ) {
    const identityKey = gestaltsUtils.keyFromIdentity(providerId, identityId);
    const identityKeyKeys = await this.getGraphDb('matrix', identityKey);
    let ops: Array<GestaltGraphOp> = [];
    if (!identityKeyKeys) {
      return ops;
    }
    ops = [
      {
        type: 'del',
        domain: 'identities',
        key: identityKey,
      },
    ];
    for (const key of Object.keys(identityKeyKeys) as Array<GestaltKey>) {
      const gId = gestaltsUtils.ungestaltKey(key);
      if (gId.type === 'node') {
        ops.push(
          ...(await this.unlinkNodeAndIdentityOps(
            gId.nodeId,
            providerId,
            identityId,
          )),
        );
      }
    }
    // ensure that an empty key set is still deleted
    ops.push({
      type: 'del',
      domain: 'matrix',
      key: identityKey,
    });
    return ops;
  }

  protected async linkNodeAndIdentityOps(
    nodeInfo: NodeInfo,
    identityInfo: IdentityInfo,
  ): Promise<Array<GestaltGraphOp>> {
    const nodeKey = gestaltsUtils.keyFromNode(nodeInfo.id);
    const identityKey = gestaltsUtils.keyFromIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    const nodeKeyKeys = (await this.getGraphDb('matrix', nodeKey)) || {};
    const identityKeyKeys =
      (await this.getGraphDb('matrix', identityKey)) || {};
    nodeKeyKeys[identityKey] = null;
    identityKeyKeys[nodeKey] = null;
    const ops: Array<GestaltGraphOp> = [
      {
        type: 'put',
        domain: 'matrix',
        key: nodeKey,
        value: nodeKeyKeys,
      },
      {
        type: 'put',
        domain: 'matrix',
        key: identityKey,
        value: identityKeyKeys,
      },
      {
        type: 'put',
        domain: 'nodes',
        key: nodeKey,
        value: nodeInfo,
      },
      {
        type: 'put',
        domain: 'identities',
        key: identityKey,
        value: identityInfo,
      },
    ];
    return ops;
  }

  protected async unlinkNodeAndIdentityOps(
    nodeId: NodeId,
    providerId: ProviderId,
    identityId: IdentityId,
  ): Promise<Array<GestaltGraphOp>> {
    const nodeKey = gestaltsUtils.keyFromNode(nodeId);
    const identityKey = gestaltsUtils.keyFromIdentity(providerId, identityId);
    const nodeKeyKeys = await this.getGraphDb('matrix', nodeKey);
    const identityKeyKeys = await this.getGraphDb('matrix', identityKey);
    const ops: Array<GestaltGraphOp> = [];
    if (nodeKeyKeys) {
      delete nodeKeyKeys[identityKey];
      if (Object.keys(nodeKeyKeys).length) {
        ops.push({
          type: 'put',
          domain: 'matrix',
          key: nodeKey,
          value: nodeKeyKeys,
        });
      } else {
        ops.push(
          {
            type: 'del',
            domain: 'matrix',
            key: nodeKey,
          },
          {
            type: 'del',
            domain: 'nodes',
            key: nodeKey,
          },
        );
      }
    }
    if (identityKeyKeys) {
      delete identityKeyKeys[nodeKey];
      if (Object.keys(identityKeyKeys).length) {
        ops.push({
          type: 'put',
          domain: 'matrix',
          key: identityKey,
          value: identityKeyKeys,
        });
      } else {
        ops.push(
          {
            type: 'del',
            domain: 'matrix',
            key: identityKey,
          },
          {
            type: 'del',
            domain: 'identities',
            key: identityKey,
          },
        );
      }
    }
    return ops;
  }

  protected async linkNodeAndNodeOps(
    nodeInfo1: NodeInfo,
    nodeInfo2: NodeInfo,
  ): Promise<Array<GestaltGraphOp>> {
    const nodeKey1 = gestaltsUtils.keyFromNode(nodeInfo1.id);
    const nodeKey2 = gestaltsUtils.keyFromNode(nodeInfo2.id);
    const nodeKeyKeys1 = (await this.getGraphDb('matrix', nodeKey1)) || {};
    const nodeKeyKeys2 = (await this.getGraphDb('matrix', nodeKey2)) || {};
    nodeKeyKeys1[nodeKey2] = null;
    nodeKeyKeys2[nodeKey1] = null;
    const ops: Array<GestaltGraphOp> = [
      {
        type: 'put',
        domain: 'matrix',
        key: nodeKey1,
        value: nodeKeyKeys1,
      },
      {
        type: 'put',
        domain: 'matrix',
        key: nodeKey2,
        value: nodeKeyKeys2,
      },
      {
        type: 'put',
        domain: 'nodes',
        key: nodeKey1,
        value: nodeInfo1,
      },
      {
        type: 'put',
        domain: 'nodes',
        key: nodeKey2,
        value: nodeInfo2,
      },
    ];
    return ops;
  }

  protected async unlinkNodeAndNodeOps(
    nodeId1: NodeId,
    nodeId2: NodeId,
  ): Promise<Array<GestaltGraphOp>> {
    const nodeKey1 = gestaltsUtils.keyFromNode(nodeId1);
    const nodeKey2 = gestaltsUtils.keyFromNode(nodeId2);
    const nodeKeyKeys1 = await this.getGraphDb('matrix', nodeKey1);
    const nodeKeyKeys2 = await this.getGraphDb('matrix', nodeKey2);
    const ops: Array<GestaltGraphOp> = [];
    if (nodeKeyKeys1) {
      delete nodeKeyKeys1[nodeKey2];
      if (Object.keys(nodeKeyKeys1).length) {
        ops.push({
          type: 'put',
          domain: 'matrix',
          key: nodeKey1,
          value: nodeKeyKeys1,
        });
      } else {
        ops.push(
          {
            type: 'del',
            domain: 'matrix',
            key: nodeKey1,
          },
          {
            type: 'del',
            domain: 'nodes',
            key: nodeKey1,
          },
        );
      }
    }
    if (nodeKeyKeys2) {
      delete nodeKeyKeys2[nodeKey1];
      if (Object.keys(nodeKeyKeys2).length) {
        ops.push({
          type: 'put',
          domain: 'matrix',
          key: nodeKey2,
          value: nodeKeyKeys2,
        });
      } else {
        ops.push(
          {
            type: 'del',
            domain: 'matrix',
            key: nodeKey2,
          },
          {
            type: 'del',
            domain: 'nodes',
            key: nodeKey2,
          },
        );
      }
    }
    return ops;
  }

  protected async getGraphDb(
    d: 'matrix',
    gK: GestaltKey,
  ): Promise<GestaltKeySet | undefined>;
  protected async getGraphDb(
    d: 'nodes',
    gK: GestaltKey,
  ): Promise<NodeInfo | undefined>;
  protected async getGraphDb(
    d: 'identities',
    gK: GestaltKey,
  ): Promise<IdentityInfo | undefined>;
  protected async getGraphDb(
    d: GestaltGraphDomain,
    gK: GestaltKey,
  ): Promise<GestaltGraphValue | undefined> {
    if (!this._started) {
      throw new gestaltsErrors.ErrorGestaltsGraphNotStarted();
    }
    const ggK = gestaltsUtils.gestaltGraphKey(d, gK);
    let data: Buffer;
    try {
      data = await this.graphDb.get(ggK);
    } catch (e) {
      if (e.notFound) {
        return undefined;
      }
      throw e;
    }
    return gestaltsUtils.unserializeGraphValue(this.graphDbKey, data);
  }

  protected async putGraphDb(
    d: 'matrix',
    gK: GestaltKey,
    ggV: GestaltKeySet,
  ): Promise<void>;
  protected async putGraphDb(
    d: 'nodes',
    gK: GestaltKey,
    ggV: NodeInfo,
  ): Promise<void>;
  protected async putGraphDb(
    d: 'identities',
    gK: GestaltKey,
    ggV: IdentityInfo,
  ): Promise<void>;
  protected async putGraphDb(
    d: GestaltGraphDomain,
    gK: GestaltKey,
    ggV: GestaltGraphValue,
  ): Promise<void> {
    if (!this._started) {
      throw new gestaltsErrors.ErrorGestaltsGraphNotStarted();
    }
    const ggK = gestaltsUtils.gestaltGraphKey(d, gK);
    const data = gestaltsUtils.serializeGraphValue(this.graphDbKey, ggV);
    await this.graphDb.put(ggK, data);
  }

  protected async delGraphDb(d: 'matrix', gK: GestaltKey): Promise<void>;
  protected async delGraphDb(d: 'nodes', gK: GestaltKey): Promise<void>;
  protected async delGraphDb(d: 'identities', gK: GestaltKey): Promise<void>;
  protected async delGraphDb(d: GestaltGraphDomain, gK: GestaltKey) {
    if (!this._started) {
      throw new gestaltsErrors.ErrorGestaltsGraphNotStarted();
    }
    const ggK = gestaltsUtils.gestaltGraphKey(d, gK);
    await this.graphDb.del(ggK);
  }

  protected async batchGraphDb(ops: Array<GestaltGraphOp>): Promise<void> {
    if (!this._started) {
      throw new gestaltsErrors.ErrorGestaltsGraphNotStarted();
    }
    const ops_: Array<AbstractBatch> = [];
    for (const op of ops) {
      if (op.type === 'del') {
        ops_.push({
          type: op.type,
          key: gestaltsUtils.gestaltGraphKey(op.domain, op.key),
        });
      } else if (op.type === 'put') {
        const ggK = gestaltsUtils.gestaltGraphKey(op.domain, op.key);
        const data = gestaltsUtils.serializeGraphValue(
          this.graphDbKey,
          op.value,
        );
        ops_.push({
          type: op.type,
          key: ggK,
          value: data,
        });
      }
    }
    await this.graphDb.batch(ops_);
  }
}

export default GestaltGraph;
