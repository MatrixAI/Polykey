import type { DB, KeyPath, LevelPath } from '@matrixai/db';
import type {
  Gestalt,
  GestaltActions,
  GestaltIdentityKey,
  GestaltKey,
  GestaltKeySet,
  GestaltNodeKey,
} from './types';
import type { Permission } from '../acl/types';
import type ACL from '../acl/ACL';
import { DBTransaction } from '@matrixai/db';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { GestaltAction } from './types';
import * as gestaltsUtils from './utils';
import * as gestaltsErrors from './errors';
import { IdentityId, IdentityInfo, ProviderId } from '../identities/types';
import { NodeId, NodeInfo } from '../nodes/types';
import * as aclUtils from '../acl/utils';
import * as utils from '../utils';
import * as nodesUtils from '../nodes/utils';

interface GestaltGraph extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new gestaltsErrors.ErrorGestaltsGraphRunning(),
  new gestaltsErrors.ErrorGestaltsGraphDestroyed(),
)
class GestaltGraph {
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
    const gestaltGraph = new this({ acl, db, logger });
    await gestaltGraph.start({ fresh });
    logger.info(`Created ${this.name}`);
    return gestaltGraph;
  }

  protected logger: Logger;
  protected db: DB;
  protected acl: ACL;
  protected gestaltGraphDbPath: LevelPath = [this.constructor.name];
  protected gestaltGraphMatrixDbPath: LevelPath = [
    this.constructor.name,
    'matrix',
  ];
  protected gestaltGraphNodesDbPath: LevelPath = [
    this.constructor.name,
    'nodes',
  ];
  protected gestaltGraphIdentitiesDbPath: LevelPath = [
    this.constructor.name,
    'identities',
  ];

  constructor({ db, acl, logger }: { db: DB; acl: ACL; logger: Logger }) {
    this.logger = logger;
    this.db = db;
    this.acl = acl;
  }

  public async start({ fresh = false }: { fresh?: boolean } = {}) {
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      await this.db.clear(this.gestaltGraphDbPath);
    }
    this.logger.info(`Started ${this.constructor.name}`);
  }

  async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.db.clear(this.gestaltGraphDbPath);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async getGestalts(tran?: DBTransaction): Promise<Array<Gestalt>> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.getGestalts(tran));
    }
    const unvisited: Map<GestaltKey, GestaltKeySet> = new Map();
    for await (const [k, gKs] of tran.iterator<GestaltKeySet>(
      [...this.gestaltGraphMatrixDbPath],
      { valueAsBuffer: false },
    )) {
      const gK = k.toString() as GestaltKey;
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
          const vertexPath = [
            ...this.gestaltGraphNodesDbPath,
            vertex as GestaltNodeKey,
          ] as unknown as KeyPath;
          const nodeInfo = await tran.get<NodeInfo>(vertexPath);
          gestalt.nodes[vertex] = nodeInfo!;
        } else if (gId.type === 'identity') {
          const vertexPath = [
            ...this.gestaltGraphIdentitiesDbPath,
            vertex as GestaltIdentityKey,
          ] as unknown as KeyPath;
          const identityInfo = await tran.get<IdentityInfo>(vertexPath);
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
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async getGestaltByNode(
    nodeId: NodeId,
    tran?: DBTransaction,
  ): Promise<Gestalt | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getGestaltByNode(nodeId, tran),
      );
    }
    const nodeKey = gestaltsUtils.keyFromNode(nodeId);
    return this.getGestaltByKey(nodeKey, tran);
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async getGestaltByIdentity(
    providerId: ProviderId,
    identityId: IdentityId,
    tran?: DBTransaction,
  ): Promise<Gestalt | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getGestaltByIdentity(providerId, identityId, tran),
      );
    }
    const identityKey = gestaltsUtils.keyFromIdentity(providerId, identityId);
    return this.getGestaltByKey(identityKey, tran);
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async setIdentity(
    identityInfo: IdentityInfo,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.setIdentity(identityInfo, tran),
      );
    }
    const identityKey = gestaltsUtils.keyFromIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    const identityKeyPath = [
      ...this.gestaltGraphMatrixDbPath,
      identityKey,
    ] as unknown as KeyPath;
    const identityKeyKeys =
      (await tran.get<GestaltKeySet>(identityKeyPath)) ?? {};
    await tran.put(identityKeyPath, identityKeyKeys);
    const identityInfoPath = [
      ...this.gestaltGraphIdentitiesDbPath,
      identityKey,
    ] as unknown as KeyPath;
    await tran.put(identityInfoPath, identityInfo);
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unsetIdentity(
    providerId: ProviderId,
    identityId: IdentityId,
    tran?: DBTransaction,
  ) {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.unsetIdentity(providerId, identityId, tran),
      );
    }
    const identityKey = gestaltsUtils.keyFromIdentity(providerId, identityId);
    const identityKeyPath = [
      ...this.gestaltGraphMatrixDbPath,
      identityKey,
    ] as unknown as KeyPath;
    const identityKeyKeys = await tran.get<GestaltKeySet>(identityKeyPath);
    if (identityKeyKeys == null) {
      return;
    }
    const identityPath = [
      ...this.gestaltGraphIdentitiesDbPath,
      identityKey,
    ] as unknown as KeyPath;
    await tran.del(identityPath);
    for (const key of Object.keys(identityKeyKeys) as Array<GestaltKey>) {
      const gId = gestaltsUtils.ungestaltKey(key);
      if (gId.type === 'node') {
        await this.unlinkNodeAndIdentity(
          nodesUtils.decodeNodeId(gId.nodeId)!,
          providerId,
          identityId,
          tran,
        );
      }
    }
    // Ensure that an empty key set is still deleted
    await tran.del(identityKeyPath);
  }

  /**
   * Sets a node in the graph
   * Can be used to update an existing node
   * If this is a new node, it will set a new node pointer
   * to a new gestalt permission in the acl
   */
  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async setNode(
    nodeInfo: NodeInfo,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.setNode(nodeInfo, tran));
    }
    const nodeKey = gestaltsUtils.keyFromNode(
      nodesUtils.decodeNodeId(nodeInfo.id)!,
    );
    const nodeKeyPath = [
      ...this.gestaltGraphMatrixDbPath,
      nodeKey,
    ] as unknown as KeyPath;
    let nodeKeyKeys = await tran.get<GestaltKeySet>(nodeKeyPath);
    if (nodeKeyKeys == null) {
      nodeKeyKeys = {};
      // Sets the gestalt in the acl
      await this.acl.setNodePerm(
        nodesUtils.decodeNodeId(nodeInfo.id)!,
        {
          gestalt: {},
          vaults: {},
        },
        tran,
      );
    }
    await tran.put(nodeKeyPath, nodeKeyKeys);
    const nodePath = [
      ...this.gestaltGraphNodesDbPath,
      nodeKey,
    ] as unknown as KeyPath;
    await tran.put(nodePath, nodeInfo);
  }

  /**
   * Removes a node in the graph
   * If this node exists, it will remove the node pointer
   * to the gestalt permission in the acl
   */
  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unsetNode(nodeId: NodeId, tran?: DBTransaction): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.unsetNode(nodeId, tran));
    }
    const nodeKey = gestaltsUtils.keyFromNode(nodeId);
    const nodeKeyPath = [
      ...this.gestaltGraphMatrixDbPath,
      nodeKey,
    ] as unknown as KeyPath;
    const nodeKeyKeys = await tran.get<GestaltKeySet>(nodeKeyPath);
    if (nodeKeyKeys == null) {
      return;
    }
    const nodePath = [
      ...this.gestaltGraphNodesDbPath,
      nodeKey,
    ] as unknown as KeyPath;
    await tran.del(nodePath);
    for (const key of Object.keys(nodeKeyKeys) as Array<GestaltKey>) {
      const gId = gestaltsUtils.ungestaltKey(key);
      if (gId.type === 'node') {
        await this.unlinkNodeAndNode(
          nodeId,
          nodesUtils.decodeNodeId(gId.nodeId)!,
          tran,
        );
      } else if (gId.type === 'identity') {
        await this.unlinkNodeAndIdentity(
          nodeId,
          gId.providerId,
          gId.identityId,
          tran,
        );
      }
    }
    // Ensure that an empty key set is still deleted
    await tran.del(nodeKeyPath);
    // Unsets the gestalt in the acl
    // this must be done after all unlinking operations
    await this.acl.unsetNodePerm(nodeId, tran);
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async linkNodeAndIdentity(
    nodeInfo: NodeInfo,
    identityInfo: IdentityInfo,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.linkNodeAndIdentity(nodeInfo, identityInfo, tran),
      );
    }
    const nodeKey = gestaltsUtils.keyFromNode(
      nodesUtils.decodeNodeId(nodeInfo.id)!,
    );
    const identityKey = gestaltsUtils.keyFromIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    const nodeKeyPath = [
      ...this.gestaltGraphMatrixDbPath,
      nodeKey,
    ] as unknown as KeyPath;
    const identityKeyPath = [
      ...this.gestaltGraphMatrixDbPath,
      identityKey,
    ] as unknown as KeyPath;
    let nodeKeyKeys = await tran.get<GestaltKeySet>(nodeKeyPath);
    let identityKeyKeys = await tran.get<GestaltKeySet>(identityKeyPath);
    // If they are already connected we do nothing
    if (
      nodeKeyKeys &&
      identityKey in nodeKeyKeys &&
      identityKeyKeys &&
      nodeKey in identityKeyKeys
    ) {
      return;
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
      await this.acl.setNodePerm(
        nodesUtils.decodeNodeId(nodeInfo.id)!,
        {
          gestalt: {},
          vaults: {},
        },
        tran,
      );
    } else if (
      !nodeNew &&
      !identityNew &&
      !utils.isEmptyObject(identityKeyKeys)
    ) {
      const [, identityNodeKeys] = await this.traverseGestalt(
        Object.keys(identityKeyKeys) as Array<GestaltKey>,
        [identityKey],
        tran,
      );
      const identityNodeIds = Array.from(identityNodeKeys, (key) =>
        gestaltsUtils.nodeFromKey(key),
      );
      // These must exist
      const nodePerm = (await this.acl.getNodePerm(
        nodesUtils.decodeNodeId(nodeInfo.id)!,
        tran,
      )) as Permission;
      const identityPerm = (await this.acl.getNodePerm(
        identityNodeIds[0],
        tran,
      )) as Permission;
      // Union the perms together
      const permNew = aclUtils.permUnion(nodePerm, identityPerm);
      // Node perm is updated and identity perm is joined to node perm
      // this has to be done as 1 call to acl in order to combine ref count update
      // and the perm record update
      await this.acl.joinNodePerm(
        nodesUtils.decodeNodeId(nodeInfo.id)!,
        identityNodeIds,
        permNew,
        tran,
      );
    } else if (nodeNew && !identityNew) {
      if (utils.isEmptyObject(identityKeyKeys)) {
        await this.acl.setNodePerm(
          nodesUtils.decodeNodeId(nodeInfo.id)!,
          {
            gestalt: {},
            vaults: {},
          },
          tran,
        );
      } else {
        let identityNodeKey: GestaltNodeKey;
        for (const gK in identityKeyKeys) {
          identityNodeKey = gK as GestaltNodeKey;
          break;
        }
        const identityNodeId = gestaltsUtils.nodeFromKey(identityNodeKey!);
        await this.acl.joinNodePerm(
          identityNodeId,
          [nodesUtils.decodeNodeId(nodeInfo.id)!],
          undefined,
          tran,
        );
      }
    }
    nodeKeyKeys[identityKey] = null;
    identityKeyKeys[nodeKey] = null;
    await tran.put(nodeKeyPath, nodeKeyKeys);
    await tran.put(identityKeyPath, identityKeyKeys);
    const nodePath = [
      ...this.gestaltGraphNodesDbPath,
      nodeKey,
    ] as unknown as KeyPath;
    await tran.put(nodePath, nodeInfo);
    const identityPath = [
      ...this.gestaltGraphIdentitiesDbPath,
      identityKey,
    ] as unknown as KeyPath;
    await tran.put(identityPath, identityInfo);
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async linkNodeAndNode(
    nodeInfo1: NodeInfo,
    nodeInfo2: NodeInfo,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.linkNodeAndNode(nodeInfo1, nodeInfo2, tran),
      );
    }
    const nodeIdEncoded1 = nodesUtils.decodeNodeId(nodeInfo1.id)!;
    const nodeIdEncoded2 = nodesUtils.decodeNodeId(nodeInfo2.id)!;
    const nodeKey1 = gestaltsUtils.keyFromNode(nodeIdEncoded1);
    const nodeKey2 = gestaltsUtils.keyFromNode(nodeIdEncoded2);
    const nodeKey1Path = [
      ...this.gestaltGraphMatrixDbPath,
      nodeKey1,
    ] as unknown as KeyPath;
    const nodeKey2Path = [
      ...this.gestaltGraphMatrixDbPath,
      nodeKey2,
    ] as unknown as KeyPath;
    let nodeKeyKeys1 = await tran.get<GestaltKeySet>(nodeKey1Path);
    let nodeKeyKeys2 = await tran.get<GestaltKeySet>(nodeKey2Path);
    // If they are already connected we do nothing
    if (
      nodeKeyKeys1 &&
      nodeKey2 in nodeKeyKeys1 &&
      nodeKeyKeys2 &&
      nodeKey1 in nodeKeyKeys2
    ) {
      return;
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
      await this.acl.setNodesPerm(
        [nodeIdEncoded1, nodeIdEncoded2],
        {
          gestalt: {},
          vaults: {},
        },
        tran,
      );
    } else if (!nodeNew1 && !nodeNew2) {
      const [, nodeNodeKeys2] = await this.traverseGestalt(
        Object.keys(nodeKeyKeys2) as Array<GestaltKey>,
        [nodeKey2],
        tran,
      );
      const nodeNodeIds2 = Array.from(nodeNodeKeys2, (key) =>
        gestaltsUtils.nodeFromKey(key),
      );
      // These must exist
      const nodePerm1 = (await this.acl.getNodePerm(
        nodeIdEncoded1,
        tran,
      )) as Permission;
      const nodePerm2 = (await this.acl.getNodePerm(
        nodeIdEncoded2,
        tran,
      )) as Permission;
      // Union the perms together
      const permNew = aclUtils.permUnion(nodePerm1, nodePerm2);
      // Node perm 1 is updated and node perm 2 is joined to node perm 2
      // this has to be done as 1 call to acl in order to combine ref count update
      // and the perm record update
      await this.acl.joinNodePerm(nodeIdEncoded1, nodeNodeIds2, permNew, tran);
    } else if (nodeNew1 && !nodeNew2) {
      await this.acl.joinNodePerm(
        nodeIdEncoded2,
        [nodeIdEncoded1],
        undefined,
        tran,
      );
    } else if (!nodeNew1 && nodeNew2) {
      await this.acl.joinNodePerm(
        nodeIdEncoded1,
        [nodeIdEncoded2],
        undefined,
        tran,
      );
    }
    nodeKeyKeys1[nodeKey2] = null;
    nodeKeyKeys2[nodeKey1] = null;
    await tran.put(nodeKey1Path, nodeKeyKeys1);
    await tran.put(nodeKey2Path, nodeKeyKeys2);
    const node1Path = [
      ...this.gestaltGraphNodesDbPath,
      nodeKey1,
    ] as unknown as KeyPath;
    await tran.put(node1Path, nodeInfo1);
    const node2Path = [
      ...this.gestaltGraphNodesDbPath,
      nodeKey2,
    ] as unknown as KeyPath;
    await tran.put(node2Path, nodeInfo2);
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unlinkNodeAndIdentity(
    nodeId: NodeId,
    providerId: ProviderId,
    identityId: IdentityId,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.unlinkNodeAndIdentity(nodeId, providerId, identityId, tran),
      );
    }
    const nodeKey = gestaltsUtils.keyFromNode(nodeId);
    const identityKey = gestaltsUtils.keyFromIdentity(providerId, identityId);
    const nodeKeyPath = [
      ...this.gestaltGraphMatrixDbPath,
      nodeKey,
    ] as unknown as KeyPath;
    const identityKeyPath = [
      ...this.gestaltGraphMatrixDbPath,
      identityKey,
    ] as unknown as KeyPath;
    const nodeKeyKeys = await tran.get<GestaltKeySet>(nodeKeyPath);
    const identityKeyKeys = await tran.get<GestaltKeySet>(identityKeyPath);
    let unlinking = false;
    if (nodeKeyKeys && identityKey in nodeKeyKeys) {
      unlinking = true;
      delete nodeKeyKeys[identityKey];
      await tran.put(nodeKeyPath, nodeKeyKeys);
    }
    if (identityKeyKeys && nodeKey in identityKeyKeys) {
      unlinking = true;
      delete identityKeyKeys[nodeKey];
      await tran.put(identityKeyPath, identityKeyKeys);
    }
    if (nodeKeyKeys && identityKeyKeys && unlinking) {
      // Check if the gestalts have split
      // if so, the node gestalt will inherit a new copy of the permission
      const [, gestaltNodeKeys, gestaltIdentityKeys] =
        await this.traverseGestalt(
          Object.keys(nodeKeyKeys) as Array<GestaltKey>,
          [nodeKey],
          tran,
        );
      if (!gestaltIdentityKeys.has(identityKey)) {
        const nodeIds = Array.from(gestaltNodeKeys, (key) =>
          gestaltsUtils.nodeFromKey(key),
        );
        // It is assumed that an existing gestalt has a permission
        const perm = (await this.acl.getNodePerm(nodeId, tran)) as Permission;
        // This remaps all existing nodes to a new permission
        await this.acl.setNodesPerm(nodeIds, perm, tran);
      }
    }
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unlinkNodeAndNode(
    nodeId1: NodeId,
    nodeId2: NodeId,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.unlinkNodeAndNode(nodeId1, nodeId2, tran),
      );
    }
    const nodeKey1 = gestaltsUtils.keyFromNode(nodeId1);
    const nodeKey2 = gestaltsUtils.keyFromNode(nodeId2);
    const nodeKey1Path = [
      ...this.gestaltGraphMatrixDbPath,
      nodeKey1,
    ] as unknown as KeyPath;
    const nodeKey2Path = [
      ...this.gestaltGraphMatrixDbPath,
      nodeKey2,
    ] as unknown as KeyPath;
    const nodeKeyKeys1 = await tran.get<GestaltKeySet>(nodeKey1Path);
    const nodeKeyKeys2 = await tran.get<GestaltKeySet>(nodeKey2Path);
    let unlinking = false;
    if (nodeKeyKeys1 && nodeKey2 in nodeKeyKeys1) {
      unlinking = true;
      delete nodeKeyKeys1[nodeKey2];
      await tran.put(nodeKey1Path, nodeKeyKeys1);
    }
    if (nodeKeyKeys2 && nodeKey1 in nodeKeyKeys2) {
      unlinking = true;
      delete nodeKeyKeys2[nodeKey1];
      await tran.put(nodeKey2Path, nodeKeyKeys2);
    }
    if (nodeKeyKeys1 && nodeKeyKeys2 && unlinking) {
      // Check if the gestalts have split
      // if so, the node gestalt will inherit a new copy of the permission
      const [, gestaltNodeKeys] = await this.traverseGestalt(
        Object.keys(nodeKeyKeys1) as Array<GestaltKey>,
        [nodeKey1],
        tran,
      );
      if (!gestaltNodeKeys.has(nodeKey2)) {
        const nodeIds = Array.from(gestaltNodeKeys, (key) =>
          gestaltsUtils.nodeFromKey(key),
        );
        // It is assumed that an existing gestalt has a permission
        const perm = (await this.acl.getNodePerm(nodeId1, tran)) as Permission;
        // This remaps all existing nodes to a new permission
        await this.acl.setNodesPerm(nodeIds, perm, tran);
      }
    }
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async getGestaltActionsByNode(
    nodeId: NodeId,
    tran?: DBTransaction,
  ): Promise<GestaltActions | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getGestaltActionsByNode(nodeId, tran),
      );
    }
    const nodeKey = gestaltsUtils.keyFromNode(nodeId);
    const nodeKeyPath = [
      ...this.gestaltGraphNodesDbPath,
      nodeKey,
    ] as unknown as KeyPath;
    if ((await tran.get<NodeInfo>(nodeKeyPath)) == null) {
      return;
    }
    const perm = await this.acl.getNodePerm(nodeId, tran);
    if (perm == null) {
      return;
    }
    return perm.gestalt;
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async getGestaltActionsByIdentity(
    providerId: ProviderId,
    identityId: IdentityId,
    tran?: DBTransaction,
  ): Promise<GestaltActions | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getGestaltActionsByIdentity(providerId, identityId, tran),
      );
    }
    const identityKey = gestaltsUtils.keyFromIdentity(providerId, identityId);
    const identityKeyPath = [
      ...this.gestaltGraphIdentitiesDbPath,
      identityKey,
    ] as unknown as KeyPath;
    if ((await tran.get<IdentityInfo>(identityKeyPath)) == null) {
      return;
    }
    const gestaltKeyPath = [
      ...this.gestaltGraphMatrixDbPath,
      identityKey,
    ] as unknown as KeyPath;
    const gestaltKeySet = (await tran.get<GestaltKeySet>(
      gestaltKeyPath,
    )) as GestaltKeySet;
    let nodeId: NodeId | undefined;
    for (const nodeKey in gestaltKeySet) {
      nodeId = gestaltsUtils.nodeFromKey(nodeKey as GestaltNodeKey);
      break;
    }
    if (nodeId == null) {
      return;
    }
    const perm = await this.acl.getNodePerm(nodeId, tran);
    if (perm == null) {
      return;
    }
    return perm.gestalt;
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async setGestaltActionByNode(
    nodeId: NodeId,
    action: GestaltAction,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.setGestaltActionByNode(nodeId, action, tran),
      );
    }
    const nodeKey = gestaltsUtils.keyFromNode(nodeId);
    const nodeKeyPath = [
      ...this.gestaltGraphNodesDbPath,
      nodeKey,
    ] as unknown as KeyPath;
    if ((await tran.get<NodeInfo>(nodeKeyPath)) == null) {
      throw new gestaltsErrors.ErrorGestaltsGraphNodeIdMissing();
    }
    await this.acl.setNodeAction(nodeId, action, tran);
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async setGestaltActionByIdentity(
    providerId: ProviderId,
    identityId: IdentityId,
    action: GestaltAction,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.setGestaltActionByIdentity(providerId, identityId, action, tran),
      );
    }
    const identityKey = gestaltsUtils.keyFromIdentity(providerId, identityId);
    const identityKeyPath = [
      ...this.gestaltGraphIdentitiesDbPath,
      identityKey,
    ] as unknown as KeyPath;
    if ((await tran.get<IdentityInfo>(identityKeyPath)) == null) {
      throw new gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing();
    }
    const gestaltKeyPath = [
      ...this.gestaltGraphMatrixDbPath,
      identityKey,
    ] as unknown as KeyPath;
    const gestaltKeySet = (await tran.get(gestaltKeyPath)) as GestaltKeySet;
    let nodeId: NodeId | undefined;
    for (const nodeKey in gestaltKeySet) {
      nodeId = gestaltsUtils.nodeFromKey(nodeKey as GestaltNodeKey);
      break;
    }
    // If there are no linked nodes, this cannot proceed
    if (nodeId == null) {
      throw new gestaltsErrors.ErrorGestaltsGraphNodeIdMissing();
    }
    await this.acl.setNodeAction(nodeId, action, tran);
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unsetGestaltActionByNode(
    nodeId: NodeId,
    action: GestaltAction,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.unsetGestaltActionByNode(nodeId, action, tran),
      );
    }
    const nodeKey = gestaltsUtils.keyFromNode(nodeId);
    const nodeKeyPath = [
      ...this.gestaltGraphNodesDbPath,
      nodeKey,
    ] as unknown as KeyPath;
    if ((await tran.get<NodeInfo>(nodeKeyPath)) == null) {
      throw new gestaltsErrors.ErrorGestaltsGraphNodeIdMissing();
    }
    await this.acl.unsetNodeAction(nodeId, action, tran);
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unsetGestaltActionByIdentity(
    providerId: ProviderId,
    identityId: IdentityId,
    action: GestaltAction,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.unsetGestaltActionByIdentity(providerId, identityId, action, tran),
      );
    }
    const identityKey = gestaltsUtils.keyFromIdentity(providerId, identityId);
    const identityKeyPath = [
      ...this.gestaltGraphIdentitiesDbPath,
      identityKey,
    ] as unknown as KeyPath;
    if ((await tran.get<IdentityInfo>(identityKeyPath)) == null) {
      throw new gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing();
    }
    const gestaltKeyPath = [
      ...this.gestaltGraphMatrixDbPath,
      identityKey,
    ] as unknown as KeyPath;
    const gestaltKeySet = (await tran.get(gestaltKeyPath)) as GestaltKeySet;
    let nodeId: NodeId | undefined;
    for (const nodeKey in gestaltKeySet) {
      nodeId = gestaltsUtils.nodeFromKey(nodeKey as GestaltNodeKey);
      break;
    }
    // If there are no linked nodes, this cannot proceed
    if (nodeId == null) {
      throw new gestaltsErrors.ErrorGestaltsGraphNodeIdMissing();
    }
    await this.acl.unsetNodeAction(nodeId, action, tran);
  }

  protected async getGestaltByKey(
    gK: GestaltKey,
    tran: DBTransaction,
  ): Promise<Gestalt | undefined> {
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
      const vertexPath = [
        ...this.gestaltGraphMatrixDbPath,
        vertex,
      ] as unknown as KeyPath;
      const vertexKeys = await tran.get<GestaltKeySet>(vertexPath);
      if (vertexKeys == null) {
        return;
      }
      const gId = gestaltsUtils.ungestaltKey(vertex);
      gestalt.matrix[vertex] = vertexKeys;
      if (gId.type === 'node') {
        const nodePath = [
          ...this.gestaltGraphNodesDbPath,
          vertex as GestaltNodeKey,
        ] as unknown as KeyPath;
        const nodeInfo = await tran.get<NodeInfo>(nodePath);
        gestalt.nodes[vertex] = nodeInfo!;
      } else if (gId.type === 'identity') {
        const identityPath = [
          ...this.gestaltGraphIdentitiesDbPath,
          vertex as GestaltIdentityKey,
        ] as unknown as KeyPath;
        const identityInfo = await tran.get<IdentityInfo>(identityPath);
        gestalt.identities[vertex] = identityInfo!;
      }
      visited.add(vertex);
      const neighbours: Array<GestaltKey> = Object.keys(vertexKeys).filter(
        (k: GestaltKey) => !visited.has(k),
      ) as Array<GestaltKey>;
      queue.push(...neighbours);
    }
    return gestalt;
  }

  protected async traverseGestalt(
    queueStart: Array<GestaltKey>,
    visitedStart: Array<GestaltKey> = [],
    tran: DBTransaction,
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
      const vertexPath = [
        ...this.gestaltGraphMatrixDbPath,
        vertex,
      ] as unknown as KeyPath;
      const vertexKeys = await tran.get<GestaltKeySet>(vertexPath);
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
}

export default GestaltGraph;
