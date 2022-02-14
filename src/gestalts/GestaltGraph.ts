import type { DB, DBLevel, DBOp } from '@matrixai/db';
import type {
  Gestalt,
  GestaltAction,
  GestaltActions,
  GestaltIdentityKey,
  GestaltKey,
  GestaltKeySet,
  GestaltNodeKey,
} from './types';
import type { NodeId, NodeInfo } from '../nodes/types';
import type { IdentityId, IdentityInfo, ProviderId } from '../identities/types';
import type { ACL } from '../acl';
import type { Permission } from '../acl/types';
import { Mutex } from 'async-mutex';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import * as gestaltsUtils from './utils';
import * as gestaltsErrors from './errors';
import * as aclUtils from '../acl/utils';
import * as utils from '../utils';
import * as nodesUtils from '../nodes/utils';

interface GestaltGraph extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new gestaltsErrors.ErrorGestaltsGraphRunning(),
  new gestaltsErrors.ErrorGestaltsGraphDestroyed(),
)
class GestaltGraph {
  protected logger: Logger;
  protected db: DB;
  protected acl: ACL;
  protected graphDbDomain: string = this.constructor.name;
  protected graphMatrixDbDomain: Array<string> = [this.graphDbDomain, 'matrix'];
  protected graphNodesDbDomain: Array<string> = [this.graphDbDomain, 'nodes'];
  protected graphIdentitiesDbDomain: Array<string> = [
    this.graphDbDomain,
    'identities',
  ];
  protected graphDb: DBLevel;
  protected graphMatrixDb: DBLevel;
  protected graphNodesDb: DBLevel;
  protected graphIdentitiesDb: DBLevel;
  protected lock: Mutex = new Mutex();

  static async createGestaltGraph({
    db,
    acl,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    acl: ACL;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<GestaltGraph> {
    logger.info(`Creating ${this.name}`);
    const gestaltGraph = new GestaltGraph({ acl, db, logger });
    await gestaltGraph.start({ fresh });
    logger.info(`Created ${this.name}`);
    return gestaltGraph;
  }

  constructor({ db, acl, logger }: { db: DB; acl: ACL; logger: Logger }) {
    this.logger = logger;
    this.db = db;
    this.acl = acl;
  }

  get locked(): boolean {
    return this.lock.isLocked();
  }

  public async start({ fresh = false }: { fresh?: boolean } = {}) {
    this.logger.info(`Starting ${this.constructor.name}`);
    const graphDb = await this.db.level(this.graphDbDomain);
    const graphMatrixDb = await this.db.level(
      this.graphMatrixDbDomain[1],
      graphDb,
    );
    const graphNodesDb = await this.db.level(
      this.graphNodesDbDomain[1],
      graphDb,
    );
    const graphIdentitiesDb = await this.db.level(
      this.graphIdentitiesDbDomain[1],
      graphDb,
    );
    if (fresh) {
      await graphDb.clear();
    }
    this.graphDb = graphDb;
    this.graphMatrixDb = graphMatrixDb;
    this.graphNodesDb = graphNodesDb;
    this.graphIdentitiesDb = graphIdentitiesDb;
    this.logger.info(`Started ${this.constructor.name}`);
  }

  async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    const graphDb = await this.db.level(this.graphDbDomain);
    await graphDb.clear();
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Run several operations within the same lock
   * This does not ensure atomicity of the underlying database
   * Database atomicity still depends on the underlying operation
   */
  public async transaction<T>(
    f: (gestaltGraph: GestaltGraph) => Promise<T>,
  ): Promise<T> {
    const release = await this.lock.acquire();
    try {
      return await f(this);
    } finally {
      release();
    }
  }

  /**
   * Transaction wrapper that will not lock if the operation was executed
   * within a transaction context
   */
  public async _transaction<T>(f: () => Promise<T>): Promise<T> {
    if (this.lock.isLocked()) {
      return await f();
    } else {
      return await this.transaction(f);
    }
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async getGestalts(): Promise<Array<Gestalt>> {
    return await this._transaction(async () => {
      const unvisited: Map<GestaltKey, GestaltKeySet> = new Map();
      for await (const o of this.graphMatrixDb.createReadStream()) {
        const gK = (o as any).key.toString() as GestaltKey;
        const data = (o as any).value as Buffer;
        const gKs = await this.db.deserializeDecrypt<GestaltKeySet>(
          data,
          false,
        );
        unvisited.set(gK, gKs);
      }
      const gestalts: Array<Gestalt> = [];
      let gestalt: Gestalt;
      for (const gKSet of unvisited) {
        gestalt = {
          matrix: {},
          nodes: {},
          identities: {},
        };
        const gK = gKSet[0];
        const queue = [gK];
        while (true) {
          const vertex = queue.shift();
          if (vertex == null) {
            gestalts.push(gestalt);
            break;
          }
          const gId = gestaltsUtils.ungestaltKey(vertex);
          const vertexKeys = unvisited.get(vertex);
          if (vertexKeys == null) {
            // This should not happen
            break;
          }
          gestalt.matrix[vertex] = vertexKeys;
          if (gId.type === 'node') {
            const nodeInfo = await this.db.get<NodeInfo>(
              this.graphNodesDbDomain,
              vertex as GestaltNodeKey,
            );
            gestalt.nodes[vertex] = nodeInfo!;
          } else if (gId.type === 'identity') {
            const identityInfo = await this.db.get<IdentityInfo>(
              this.graphIdentitiesDbDomain,
              vertex as GestaltIdentityKey,
            );
            gestalt.identities[vertex] = identityInfo!;
          }
          unvisited.delete(vertex);
          const neighbours: Array<GestaltKey> = Object.keys(vertexKeys).filter(
            (k: GestaltKey) => unvisited.has(k),
          ) as Array<GestaltKey>;
          queue.push(...neighbours);
        }
      }
      return gestalts;
    });
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async getGestaltByNode(nodeId: NodeId): Promise<Gestalt | undefined> {
    const nodeKey = gestaltsUtils.keyFromNode(nodeId);
    return this.getGestaltByKey(nodeKey);
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async getGestaltByIdentity(
    providerId: ProviderId,
    identityId: IdentityId,
  ): Promise<Gestalt | undefined> {
    const identityKey = gestaltsUtils.keyFromIdentity(providerId, identityId);
    return this.getGestaltByKey(identityKey);
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async setIdentity(identityInfo: IdentityInfo): Promise<void> {
    return await this._transaction(async () => {
      const ops = await this.setIdentityOps(identityInfo);
      await this.db.batch(ops);
    });
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async setIdentityOps(
    identityInfo: IdentityInfo,
  ): Promise<Array<DBOp>> {
    const identityKey = gestaltsUtils.keyFromIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    const identityKeyKeys =
      (await this.db.get<GestaltKeySet>(
        this.graphMatrixDbDomain,
        identityKey,
      )) ?? {};
    const ops: Array<DBOp> = [
      {
        type: 'put',
        domain: this.graphMatrixDbDomain,
        key: identityKey,
        value: identityKeyKeys,
      },
      {
        type: 'put',
        domain: this.graphIdentitiesDbDomain,
        key: identityKey,
        value: identityInfo,
      },
    ];
    return ops;
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unsetIdentity(providerId: ProviderId, identityId: IdentityId) {
    return await this._transaction(async () => {
      return await this.acl._transaction(async () => {
        const ops = await this.unsetIdentityOps(providerId, identityId);
        await this.db.batch(ops);
      });
    });
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unsetIdentityOps(
    providerId: ProviderId,
    identityId: IdentityId,
  ) {
    const identityKey = gestaltsUtils.keyFromIdentity(providerId, identityId);
    const identityKeyKeys = await this.db.get<GestaltKeySet>(
      this.graphMatrixDbDomain,
      identityKey,
    );
    const ops: Array<DBOp> = [];
    if (identityKeyKeys == null) {
      return ops;
    }
    ops.push({
      type: 'del',
      domain: this.graphIdentitiesDbDomain,
      key: identityKey,
    });
    for (const key of Object.keys(identityKeyKeys) as Array<GestaltKey>) {
      const gId = gestaltsUtils.ungestaltKey(key);
      if (gId.type === 'node') {
        ops.push(
          ...(await this.unlinkNodeAndIdentityOps(
            nodesUtils.decodeNodeId(gId.nodeId)!,
            providerId,
            identityId,
          )),
        );
      }
    }
    // Ensure that an empty key set is still deleted
    ops.push({
      type: 'del',
      domain: this.graphMatrixDbDomain,
      key: identityKey,
    });
    return ops;
  }

  /**
   * Sets a node in the graph
   * Can be used to update an existing node
   * If this is a new node, it will set a new node pointer
   * to a new gestalt permission in the acl
   */
  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async setNode(nodeInfo: NodeInfo): Promise<void> {
    return await this._transaction(async () => {
      return await this.acl._transaction(async () => {
        const ops = await this.setNodeOps(nodeInfo);
        await this.db.batch(ops);
      });
    });
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async setNodeOps(nodeInfo: NodeInfo): Promise<Array<DBOp>> {
    const nodeKey = gestaltsUtils.keyFromNode(
      nodesUtils.decodeNodeId(nodeInfo.id)!,
    );
    const ops: Array<DBOp> = [];
    let nodeKeyKeys = await this.db.get<GestaltKeySet>(
      this.graphMatrixDbDomain,
      nodeKey,
    );
    if (nodeKeyKeys == null) {
      nodeKeyKeys = {};
      // Sets the gestalt in the acl
      ops.push(
        ...(await this.acl.setNodePermOps(
          nodesUtils.decodeNodeId(nodeInfo.id)!,
          {
            gestalt: {},
            vaults: {},
          },
        )),
      );
    }
    ops.push(
      {
        type: 'put',
        domain: this.graphMatrixDbDomain,
        key: nodeKey,
        value: nodeKeyKeys,
      },
      {
        type: 'put',
        domain: this.graphNodesDbDomain,
        key: nodeKey,
        value: nodeInfo,
      },
    );
    return ops;
  }

  /**
   * Removes a node in the graph
   * If this node exists, it will remove the node pointer
   * to the gestalt permission in the acl
   */
  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unsetNode(nodeId: NodeId): Promise<void> {
    return await this._transaction(async () => {
      return await this.acl._transaction(async () => {
        const ops = await this.unsetNodeOps(nodeId);
        await this.db.batch(ops);
      });
    });
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unsetNodeOps(nodeId: NodeId): Promise<Array<DBOp>> {
    const nodeKey = gestaltsUtils.keyFromNode(nodeId);
    const nodeKeyKeys = await this.db.get<GestaltKeySet>(
      this.graphMatrixDbDomain,
      nodeKey,
    );
    const ops: Array<DBOp> = [];
    if (nodeKeyKeys == null) {
      return ops;
    }
    ops.push({
      type: 'del',
      domain: this.graphNodesDbDomain,
      key: nodeKey,
    });
    for (const key of Object.keys(nodeKeyKeys) as Array<GestaltKey>) {
      const gId = gestaltsUtils.ungestaltKey(key);
      if (gId.type === 'node') {
        ops.push(
          ...(await this.unlinkNodeAndNodeOps(
            nodeId,
            nodesUtils.decodeNodeId(gId.nodeId)!,
          )),
        );
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
    // Ensure that an empty key set is still deleted
    ops.push({
      type: 'del',
      domain: this.graphMatrixDbDomain,
      key: nodeKey,
    });
    // Unsets the gestalt in the acl
    // this must be done after all unlinking operations
    ops.push(...(await this.acl.unsetNodePermOps(nodeId)));
    return ops;
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async linkNodeAndIdentity(
    nodeInfo: NodeInfo,
    identityInfo: IdentityInfo,
  ): Promise<void> {
    return await this._transaction(async () => {
      return await this.acl._transaction(async () => {
        const ops = await this.linkNodeAndIdentityOps(nodeInfo, identityInfo);
        await this.db.batch(ops);
      });
    });
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async linkNodeAndIdentityOps(
    nodeInfo: NodeInfo,
    identityInfo: IdentityInfo,
  ): Promise<Array<DBOp>> {
    const ops: Array<DBOp> = [];
    const nodeKey = gestaltsUtils.keyFromNode(
      nodesUtils.decodeNodeId(nodeInfo.id)!,
    );
    const identityKey = gestaltsUtils.keyFromIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    let nodeKeyKeys = await this.db.get<GestaltKeySet>(
      this.graphMatrixDbDomain,
      nodeKey,
    );
    let identityKeyKeys = await this.db.get<GestaltKeySet>(
      this.graphMatrixDbDomain,
      identityKey,
    );
    // If they are already connected we do nothing
    if (
      nodeKeyKeys &&
      identityKey in nodeKeyKeys &&
      identityKeyKeys &&
      nodeKey in identityKeyKeys
    ) {
      return ops;
    }
    let nodeNew = false;
    if (nodeKeyKeys == null) {
      nodeNew = true;
      nodeKeyKeys = {};
    }
    let identityNew = false;
    if (identityKeyKeys == null) {
      identityNew = true;
      identityKeyKeys = {};
    }
    // Acl changes depend on the situation:
    // if both node and identity are new  then
    //   set a new permission for the node
    // if both node and identity exists then
    //   if the identity key set is empty then
    //     do nothing
    //   else
    //     join identity gestalt's permission to the node gestalt
    //     make sure to do a perm union
    // if node exists but identity is new then
    //   do nothing
    // if node is new but identity exists
    //   if the identity key set is empty then
    //     set a new permission for the node
    //   else
    //     join node gestalt's permission to the identity gestalt
    if (nodeNew && identityNew) {
      ops.push(
        ...(await this.acl.setNodePermOps(
          nodesUtils.decodeNodeId(nodeInfo.id)!,
          {
            gestalt: {},
            vaults: {},
          },
        )),
      );
    } else if (
      !nodeNew &&
      !identityNew &&
      !utils.isEmptyObject(identityKeyKeys)
    ) {
      const [, identityNodeKeys] = await this.traverseGestalt(
        Object.keys(identityKeyKeys) as Array<GestaltKey>,
        [identityKey],
      );
      const identityNodeIds = Array.from(identityNodeKeys, (key) =>
        gestaltsUtils.nodeFromKey(key),
      );
      // These must exist
      const nodePerm = (await this.acl.getNodePerm(
        nodesUtils.decodeNodeId(nodeInfo.id)!,
      )) as Permission;
      const identityPerm = (await this.acl.getNodePerm(
        identityNodeIds[0],
      )) as Permission;
      // Union the perms together
      const permNew = aclUtils.permUnion(nodePerm, identityPerm);
      // Node perm is updated and identity perm is joined to node perm
      // this has to be done as 1 call to acl in order to combine ref count update
      // and the perm record update
      ops.push(
        ...(await this.acl.joinNodePermOps(
          nodesUtils.decodeNodeId(nodeInfo.id)!,
          identityNodeIds,
          permNew,
        )),
      );
    } else if (nodeNew && !identityNew) {
      if (utils.isEmptyObject(identityKeyKeys)) {
        ops.push(
          ...(await this.acl.setNodePermOps(
            nodesUtils.decodeNodeId(nodeInfo.id)!,
            {
              gestalt: {},
              vaults: {},
            },
          )),
        );
      } else {
        let identityNodeKey: GestaltNodeKey;
        for (const gK in identityKeyKeys) {
          identityNodeKey = gK as GestaltNodeKey;
          break;
        }
        const identityNodeId = gestaltsUtils.nodeFromKey(identityNodeKey!);
        ops.push(
          ...(await this.acl.joinNodePermOps(identityNodeId, [
            nodesUtils.decodeNodeId(nodeInfo.id)!,
          ])),
        );
      }
    }
    nodeKeyKeys[identityKey] = null;
    identityKeyKeys[nodeKey] = null;
    ops.push(
      {
        type: 'put',
        domain: this.graphMatrixDbDomain,
        key: nodeKey,
        value: nodeKeyKeys,
      },
      {
        type: 'put',
        domain: this.graphMatrixDbDomain,
        key: identityKey,
        value: identityKeyKeys,
      },
      {
        type: 'put',
        domain: this.graphNodesDbDomain,
        key: nodeKey,
        value: nodeInfo,
      },
      {
        type: 'put',
        domain: this.graphIdentitiesDbDomain,
        key: identityKey,
        value: identityInfo,
      },
    );
    return ops;
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async linkNodeAndNode(
    nodeInfo1: NodeInfo,
    nodeInfo2: NodeInfo,
  ): Promise<void> {
    return await this._transaction(async () => {
      return await this.acl._transaction(async () => {
        const ops = await this.linkNodeAndNodeOps(nodeInfo1, nodeInfo2);
        await this.db.batch(ops);
      });
    });
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async linkNodeAndNodeOps(
    nodeInfo1: NodeInfo,
    nodeInfo2: NodeInfo,
  ): Promise<Array<DBOp>> {
    const ops: Array<DBOp> = [];
    const nodeIdEncoded1 = nodesUtils.decodeNodeId(nodeInfo1.id)!;
    const nodeIdEncoded2 = nodesUtils.decodeNodeId(nodeInfo2.id)!;
    const nodeKey1 = gestaltsUtils.keyFromNode(nodeIdEncoded1);
    const nodeKey2 = gestaltsUtils.keyFromNode(nodeIdEncoded2);
    let nodeKeyKeys1 = await this.db.get<GestaltKeySet>(
      this.graphMatrixDbDomain,
      nodeKey1,
    );
    let nodeKeyKeys2 = await this.db.get<GestaltKeySet>(
      this.graphMatrixDbDomain,
      nodeKey2,
    );
    // If they are already connected we do nothing
    if (
      nodeKeyKeys1 &&
      nodeKey2 in nodeKeyKeys1 &&
      nodeKeyKeys2 &&
      nodeKey1 in nodeKeyKeys2
    ) {
      return ops;
    }
    let nodeNew1 = false;
    if (nodeKeyKeys1 == null) {
      nodeNew1 = true;
      nodeKeyKeys1 = {};
    }
    let nodeNew2 = false;
    if (nodeKeyKeys2 == null) {
      nodeNew2 = true;
      nodeKeyKeys2 = {};
    }
    // Acl changes depend on the situation:
    // if both node1 and node2 are new  then
    //   set a new permission for both nodes
    // if both node1 and node2 exists then
    //   join node 2 gestalt's permission to the node 1 gestalt
    //   make sure to do a perm union
    // if node 1 exists but node 2 is new then
    //   join node 2 gestalt's permission to the node 1 gestalt
    // if node 1 is new but node 2 exists
    //   join node 1 gestalt's permission to the node 2 gestalt
    if (nodeNew1 && nodeNew2) {
      ops.push(
        ...(await this.acl.setNodesPermOps([nodeIdEncoded1, nodeIdEncoded2], {
          gestalt: {},
          vaults: {},
        })),
      );
    } else if (!nodeNew1 && !nodeNew2) {
      const [, nodeNodeKeys2] = await this.traverseGestalt(
        Object.keys(nodeKeyKeys2) as Array<GestaltKey>,
        [nodeKey2],
      );
      const nodeNodeIds2 = Array.from(nodeNodeKeys2, (key) =>
        gestaltsUtils.nodeFromKey(key),
      );
      // These must exist
      const nodePerm1 = (await this.acl.getNodePerm(
        nodeIdEncoded1,
      )) as Permission;
      const nodePerm2 = (await this.acl.getNodePerm(
        nodeIdEncoded2,
      )) as Permission;
      // Union the perms together
      const permNew = aclUtils.permUnion(nodePerm1, nodePerm2);
      // Node perm 1 is updated and node perm 2 is joined to node perm 2
      // this has to be done as 1 call to acl in order to combine ref count update
      // and the perm record update
      ops.push(
        ...(await this.acl.joinNodePermOps(
          nodeIdEncoded1,
          nodeNodeIds2,
          permNew,
        )),
      );
    } else if (nodeNew1 && !nodeNew2) {
      ops.push(
        ...(await this.acl.joinNodePermOps(nodeIdEncoded2, [nodeIdEncoded1])),
      );
    } else if (!nodeNew1 && nodeNew2) {
      ops.push(
        ...(await this.acl.joinNodePermOps(nodeIdEncoded1, [nodeIdEncoded2])),
      );
    }
    nodeKeyKeys1[nodeKey2] = null;
    nodeKeyKeys2[nodeKey1] = null;
    ops.push(
      {
        type: 'put',
        domain: this.graphMatrixDbDomain,
        key: nodeKey1,
        value: nodeKeyKeys1,
      },
      {
        type: 'put',
        domain: this.graphMatrixDbDomain,
        key: nodeKey2,
        value: nodeKeyKeys2,
      },
      {
        type: 'put',
        domain: this.graphNodesDbDomain,
        key: nodeKey1,
        value: nodeInfo1,
      },
      {
        type: 'put',
        domain: this.graphNodesDbDomain,
        key: nodeKey2,
        value: nodeInfo2,
      },
    );
    return ops;
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unlinkNodeAndIdentity(
    nodeId: NodeId,
    providerId: ProviderId,
    identityId: IdentityId,
  ): Promise<void> {
    return await this._transaction(async () => {
      return await this.acl._transaction(async () => {
        const ops = await this.unlinkNodeAndIdentityOps(
          nodeId,
          providerId,
          identityId,
        );
        await this.db.batch(ops);
      });
    });
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unlinkNodeAndIdentityOps(
    nodeId: NodeId,
    providerId: ProviderId,
    identityId: IdentityId,
  ): Promise<Array<DBOp>> {
    const nodeKey = gestaltsUtils.keyFromNode(nodeId);
    const identityKey = gestaltsUtils.keyFromIdentity(providerId, identityId);
    const nodeKeyKeys = await this.db.get<GestaltKeySet>(
      this.graphMatrixDbDomain,
      nodeKey,
    );
    const identityKeyKeys = await this.db.get<GestaltKeySet>(
      this.graphMatrixDbDomain,
      identityKey,
    );
    let unlinking = false;
    const ops: Array<DBOp> = [];
    if (nodeKeyKeys && identityKey in nodeKeyKeys) {
      unlinking = true;
      delete nodeKeyKeys[identityKey];
      ops.push({
        type: 'put',
        domain: this.graphMatrixDbDomain,
        key: nodeKey,
        value: nodeKeyKeys,
      });
    }
    if (identityKeyKeys && nodeKey in identityKeyKeys) {
      unlinking = true;
      delete identityKeyKeys[nodeKey];
      ops.push({
        type: 'put',
        domain: this.graphMatrixDbDomain,
        key: identityKey,
        value: identityKeyKeys,
      });
    }
    if (nodeKeyKeys && identityKeyKeys && unlinking) {
      // Check if the gestalts have split
      // if so, the node gestalt will inherit a new copy of the permission
      const [, gestaltNodeKeys, gestaltIdentityKeys] =
        await this.traverseGestalt(
          Object.keys(nodeKeyKeys) as Array<GestaltKey>,
          [nodeKey],
        );
      if (!gestaltIdentityKeys.has(identityKey)) {
        const nodeIds = Array.from(gestaltNodeKeys, (key) =>
          gestaltsUtils.nodeFromKey(key),
        );
        // It is assumed that an existing gestalt has a permission
        const perm = (await this.acl.getNodePerm(nodeId)) as Permission;
        // This remaps all existing nodes to a new permission
        ops.push(...(await this.acl.setNodesPermOps(nodeIds, perm)));
      }
    }
    return ops;
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unlinkNodeAndNode(
    nodeId1: NodeId,
    nodeId2: NodeId,
  ): Promise<void> {
    return await this._transaction(async () => {
      return await this.acl._transaction(async () => {
        const ops = await this.unlinkNodeAndNodeOps(nodeId1, nodeId2);
        await this.db.batch(ops);
      });
    });
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unlinkNodeAndNodeOps(
    nodeId1: NodeId,
    nodeId2: NodeId,
  ): Promise<Array<DBOp>> {
    const nodeKey1 = gestaltsUtils.keyFromNode(nodeId1);
    const nodeKey2 = gestaltsUtils.keyFromNode(nodeId2);
    const nodeKeyKeys1 = await this.db.get<GestaltKeySet>(
      this.graphMatrixDbDomain,
      nodeKey1,
    );
    const nodeKeyKeys2 = await this.db.get<GestaltKeySet>(
      this.graphMatrixDbDomain,
      nodeKey2,
    );
    let unlinking = false;
    const ops: Array<DBOp> = [];
    if (nodeKeyKeys1 && nodeKey2 in nodeKeyKeys1) {
      unlinking = true;
      delete nodeKeyKeys1[nodeKey2];
      ops.push({
        type: 'put',
        domain: this.graphMatrixDbDomain,
        key: nodeKey1,
        value: nodeKeyKeys1,
      });
    }
    if (nodeKeyKeys2 && nodeKey1 in nodeKeyKeys2) {
      unlinking = true;
      delete nodeKeyKeys2[nodeKey1];
      ops.push({
        type: 'put',
        domain: this.graphMatrixDbDomain,
        key: nodeKey2,
        value: nodeKeyKeys2,
      });
    }
    if (nodeKeyKeys1 && nodeKeyKeys2 && unlinking) {
      // Check if the gestalts have split
      // if so, the node gestalt will inherit a new copy of the permission
      const [, gestaltNodeKeys] = await this.traverseGestalt(
        Object.keys(nodeKeyKeys1) as Array<GestaltKey>,
        [nodeKey1],
      );
      if (!gestaltNodeKeys.has(nodeKey2)) {
        const nodeIds = Array.from(gestaltNodeKeys, (key) =>
          gestaltsUtils.nodeFromKey(key),
        );
        // It is assumed that an existing gestalt has a permission
        const perm = (await this.acl.getNodePerm(nodeId1)) as Permission;
        // This remaps all existing nodes to a new permission
        ops.push(...(await this.acl.setNodesPermOps(nodeIds, perm)));
      }
    }
    return ops;
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async getGestaltActionsByNode(
    nodeId: NodeId,
  ): Promise<GestaltActions | undefined> {
    return await this._transaction(async () => {
      return await this.acl._transaction(async () => {
        const nodeKey = gestaltsUtils.keyFromNode(nodeId);
        if (
          (await this.db.get<NodeInfo>(this.graphNodesDbDomain, nodeKey)) ==
          null
        ) {
          return;
        }
        const perm = await this.acl.getNodePerm(nodeId);
        if (perm == null) {
          return;
        }
        return perm.gestalt;
      });
    });
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async getGestaltActionsByIdentity(
    providerId: ProviderId,
    identityId: IdentityId,
  ): Promise<GestaltActions | undefined> {
    return await this._transaction(async () => {
      return await this.acl._transaction(async () => {
        const identityKey = gestaltsUtils.keyFromIdentity(
          providerId,
          identityId,
        );
        if (
          (await this.db.get<IdentityInfo>(
            this.graphIdentitiesDbDomain,
            identityKey,
          )) == null
        ) {
          return;
        }
        const gestaltKeySet = (await this.db.get<GestaltKeySet>(
          this.graphMatrixDbDomain,
          identityKey,
        )) as GestaltKeySet;
        let nodeId: NodeId | undefined;
        for (const nodeKey in gestaltKeySet) {
          nodeId = gestaltsUtils.nodeFromKey(nodeKey as GestaltNodeKey);
          break;
        }
        if (nodeId == null) {
          return;
        }
        const perm = await this.acl.getNodePerm(nodeId);
        if (perm == null) {
          return;
        }
        return perm.gestalt;
      });
    });
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async setGestaltActionByNode(
    nodeId: NodeId,
    action: GestaltAction,
  ): Promise<void> {
    return await this._transaction(async () => {
      return await this.acl._transaction(async () => {
        const nodeKey = gestaltsUtils.keyFromNode(nodeId);
        if (
          (await this.db.get<NodeInfo>(this.graphNodesDbDomain, nodeKey)) ==
          null
        ) {
          throw new gestaltsErrors.ErrorGestaltsGraphNodeIdMissing();
        }
        await this.acl.setNodeAction(nodeId, action);
      });
    });
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async setGestaltActionByIdentity(
    providerId: ProviderId,
    identityId: IdentityId,
    action: GestaltAction,
  ): Promise<void> {
    return await this._transaction(async () => {
      return await this.acl._transaction(async () => {
        const identityKey = gestaltsUtils.keyFromIdentity(
          providerId,
          identityId,
        );
        if (
          (await this.db.get<IdentityInfo>(
            this.graphIdentitiesDbDomain,
            identityKey,
          )) == null
        ) {
          throw new gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing();
        }
        const gestaltKeySet = (await this.db.get(
          this.graphMatrixDbDomain,
          identityKey,
        )) as GestaltKeySet;
        let nodeId: NodeId | undefined;
        for (const nodeKey in gestaltKeySet) {
          nodeId = gestaltsUtils.nodeFromKey(nodeKey as GestaltNodeKey);
          break;
        }
        // If there are no linked nodes, this cannot proceed
        if (nodeId == null) {
          throw new gestaltsErrors.ErrorGestaltsGraphNodeIdMissing();
        }
        await this.acl.setNodeAction(nodeId, action);
      });
    });
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unsetGestaltActionByNode(
    nodeId: NodeId,
    action: GestaltAction,
  ): Promise<void> {
    return await this._transaction(async () => {
      return await this.acl._transaction(async () => {
        const nodeKey = gestaltsUtils.keyFromNode(nodeId);
        if (
          (await this.db.get<NodeInfo>(this.graphNodesDbDomain, nodeKey)) ==
          null
        ) {
          throw new gestaltsErrors.ErrorGestaltsGraphNodeIdMissing();
        }
        await this.acl.unsetNodeAction(nodeId, action);
      });
    });
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unsetGestaltActionByIdentity(
    providerId: ProviderId,
    identityId: IdentityId,
    action: GestaltAction,
  ): Promise<void> {
    return await this._transaction(async () => {
      return await this.acl._transaction(async () => {
        const identityKey = gestaltsUtils.keyFromIdentity(
          providerId,
          identityId,
        );
        if (
          (await this.db.get<IdentityInfo>(
            this.graphIdentitiesDbDomain,
            identityKey,
          )) == null
        ) {
          throw new gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing();
        }
        const gestaltKeySet = (await this.db.get(
          this.graphMatrixDbDomain,
          identityKey,
        )) as GestaltKeySet;
        let nodeId: NodeId | undefined;
        for (const nodeKey in gestaltKeySet) {
          nodeId = gestaltsUtils.nodeFromKey(nodeKey as GestaltNodeKey);
          break;
        }
        // If there are no linked nodes, this cannot proceed
        if (nodeId == null) {
          throw new gestaltsErrors.ErrorGestaltsGraphNodeIdMissing();
        }
        await this.acl.unsetNodeAction(nodeId, action);
      });
    });
  }

  protected async getGestaltByKey(
    gK: GestaltKey,
  ): Promise<Gestalt | undefined> {
    return await this._transaction(async () => {
      const gestalt: Gestalt = {
        matrix: {},
        nodes: {},
        identities: {},
      };
      // We are not using traverseGestalt
      // because this requires keeping track of the vertexKeys
      const queue = [gK];
      const visited = new Set<GestaltKey>();
      while (true) {
        const vertex = queue.shift();
        if (vertex == null) {
          break;
        }
        const vertexKeys = await this.db.get<GestaltKeySet>(
          this.graphMatrixDbDomain,
          vertex,
        );
        if (vertexKeys == null) {
          return;
        }
        const gId = gestaltsUtils.ungestaltKey(vertex);
        gestalt.matrix[vertex] = vertexKeys;
        if (gId.type === 'node') {
          const nodeInfo = await this.db.get<NodeInfo>(
            this.graphNodesDbDomain,
            vertex as GestaltNodeKey,
          );
          gestalt.nodes[vertex] = nodeInfo!;
        } else if (gId.type === 'identity') {
          const identityInfo = await this.db.get<IdentityInfo>(
            this.graphIdentitiesDbDomain,
            vertex as GestaltIdentityKey,
          );
          gestalt.identities[vertex] = identityInfo!;
        }
        visited.add(vertex);
        const neighbours: Array<GestaltKey> = Object.keys(vertexKeys).filter(
          (k: GestaltKey) => !visited.has(k),
        ) as Array<GestaltKey>;
        queue.push(...neighbours);
      }
      return gestalt;
    });
  }

  protected async traverseGestalt(
    queueStart: Array<GestaltKey>,
    visitedStart: Array<GestaltKey> = [],
  ): Promise<[Set<GestaltKey>, Set<GestaltNodeKey>, Set<GestaltIdentityKey>]> {
    const queue = [...queueStart];
    const visited = new Set<GestaltKey>(visitedStart);
    const visitedNodes = new Set<GestaltNodeKey>();
    const visitedIdentities = new Set<GestaltIdentityKey>();
    for (const gK of visitedStart) {
      const gId = gestaltsUtils.ungestaltKey(gK);
      if (gId.type === 'node') {
        visitedNodes.add(gK as GestaltNodeKey);
      } else if (gId.type === 'identity') {
        visitedIdentities.add(gK as GestaltIdentityKey);
      }
    }
    while (true) {
      const vertex = queue.shift();
      if (vertex == null) {
        break;
      }
      const vertexKeys = await this.db.get<GestaltKeySet>(
        this.graphMatrixDbDomain,
        vertex,
      );
      if (vertexKeys == null) {
        break;
      }
      const gId = gestaltsUtils.ungestaltKey(vertex);
      if (gId.type === 'node') {
        visitedNodes.add(vertex as GestaltNodeKey);
      } else if (gId.type === 'identity') {
        visitedIdentities.add(vertex as GestaltIdentityKey);
      }
      visited.add(vertex);
      const neighbours: Array<GestaltKey> = Object.keys(vertexKeys).filter(
        (k: GestaltKey) => !visited.has(k),
      ) as Array<GestaltKey>;
      queue.push(...neighbours);
    }
    return [visited, visitedNodes, visitedIdentities];
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async clearDB() {
    await this.graphDb.clear();
  }
}

export default GestaltGraph;
