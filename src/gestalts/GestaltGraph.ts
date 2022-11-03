import type { DB, DBIterator, DBTransaction, KeyPath, LevelPath } from '@matrixai/db';
import type {
  Gestalt,
  GestaltAction,
  GestaltActions,
  // GestaltIdentityKey,
  GestaltKey,
  GestaltLinkId,
  GestaltNodeInfo,
  GestaltNodeInfoJSON,
  GestaltIdentityInfo,
  GestaltLink,
  GestaltLinks,
  // GestaltNodeKey,
  GestaltLinkNode,
  // GestaltNodeId,
  // GestaltIdentityId,
} from './types';
import type { NodeId, ProviderIdentityId } from '../ids/types';
import type { Permission } from '../acl/types';
import type ACL from '../acl/ACL';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { IdInternal } from '@matrixai/id';
import * as gestaltsUtils from './utils';
import * as gestaltsErrors from './errors';
import * as nodesUtils from '../nodes/utils';
import * as aclUtils from '../acl/utils';
import * as utils from '../utils';
import * as ids from '../ids';

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

  public readonly dbPath: Readonly<LevelPath> = [this.constructor.name];

  /**
   * Gestalt adjacency matrix represented as a collection vertex pairs.
   * Each vertex can be `GestaltNodeKey` or `GestaltIdentityKey`.
   * These are the allowable structures:
   * `GestaltGraph/matrix/{GestaltKey} -> null`
   * `GestaltGraph/matrix/{GestaltKey}/{GestaltKey} -> {raw(GestaltLinkId)}`
   */
  public readonly dbMatrixPath: Readonly<LevelPath> = [this.constructor.name, 'matrix'];

  /**
   * Gestalt links.
   * `GestaltGraph/links/{GestaltLinkId} -> {json(GestaltLink)}`
   */
  public readonly dbLinksPath: Readonly<LevelPath> = [this.constructor.name, 'links'];

  /**
   * Node information
   * `GestaltGraph/nodes/{GestaltKey} -> {json(GestaltNodeInfo)}`
   */
  public readonly dbNodesPath: Readonly<LevelPath> = [this.constructor.name, 'nodes'];

  /**
   * Identity information
   * `GestaltGraph/identities/{GestaltKey} -> {json(GestaltIdentityInfo)}`
   */
  public readonly dbIdentitiesPath: LevelPath = [this.constructor.name, 'identities'];

  protected generateGestaltLinkId: () => GestaltLinkId;

  constructor({ db, acl, logger }: { db: DB; acl: ACL; logger: Logger }) {
    this.logger = logger;
    this.db = db;
    this.acl = acl;
  }

  public async start({ fresh = false }: { fresh?: boolean } = {}) {
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      await this.db.clear(this.dbMatrixPath);
    }
    this.generateGestaltLinkId = gestaltsUtils.createGestaltLinkIdGenerator();
    this.logger.info(`Started ${this.constructor.name}`);
  }

  async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.db.clear(this.dbMatrixPath);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async *getGestalts(tran?: DBTransaction): AsyncGenerator<Gestalt> {
    if (tran == null) {
      return yield* this.db.withTransactionG((tran) =>
        this.getGestalts(tran),
      );
    }
    const visited: Set<string> = new Set();
    let lastGestaltKey: GestaltKey | null = null;
    for await (const [[gestaltKey]] of tran.iterator(
      this.dbMatrixPath,
      { values: false }
    ) as DBIterator<[GestaltKey], undefined>) {
      if (lastGestaltKey == null) {
        lastGestaltKey = gestaltKey;
      }
      if (visited.has(gestaltKey.toString('binary'))) {
        // Garbage collect the last gestalt key since it will never be iterated upon
        if (!lastGestaltKey.equals(gestaltKey)) {
          visited.delete(lastGestaltKey.toString('binary'));
          lastGestaltKey = gestaltKey;
        }
        continue;
      }
      // Garbage collect the last gestalt key since it will never be iterated upon
      if (!lastGestaltKey.equals(gestaltKey)) {
        visited.delete(lastGestaltKey.toString('binary'));
        lastGestaltKey = gestaltKey;
      }
      const gestalt = (await this.getGestaltByKey(
        gestaltKey,
        visited,
        tran
      ))!;
      yield gestalt;
    }
  }

  /**
   * Sets a node in the graph
   * Can be used to update an existing node
   * If this is a new node, it will set a new node pointer
   * to a new gestalt permission in the acl
   */
  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async setNode(
    nodeInfo: GestaltNodeInfo,
    tran?: DBTransaction,
  ): Promise<['node', NodeId]> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.setNode(nodeInfo, tran));
    }
    const gestaltNodeId = ['node', nodeInfo.nodeId] as ['node', NodeId];
    const gestaltNodeKey = gestaltsUtils.toGestaltNodeKey(
      gestaltNodeId
    );
    const nodeInfoJSON = await tran.get<GestaltNodeInfoJSON>([
      ...this.dbNodesPath,
      gestaltNodeKey
    ]);
    if (nodeInfoJSON == null) {
      // Set the singleton node
      await tran.put([...this.dbMatrixPath, gestaltNodeKey], null);
      // Sets the gestalt in the acl
      await this.acl.setNodePerm(
        nodeInfo.nodeId,
        {
          gestalt: {},
          vaults: {},
        },
        tran,
      );
    }
    // Updates the node information
    await tran.put([...this.dbNodesPath, gestaltNodeKey], nodeInfo);
    return gestaltNodeId;
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async setIdentity(
    identityInfo: GestaltIdentityInfo,
    tran?: DBTransaction,
  ): Promise<['identity', ProviderIdentityId]> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.setIdentity(identityInfo, tran),
      );
    }
    const gestaltIdentityId = [
      'identity',
      [identityInfo.providerId, identityInfo.identityId]
    ] as ['identity', ProviderIdentityId];
    const gestaltIdentityKey = gestaltsUtils.toGestaltIdentityKey(gestaltIdentityId);
    const identityInfo_ = await tran.get<GestaltIdentityInfo>([
      ...this.dbIdentitiesPath,
      gestaltIdentityKey
    ]);
    if (identityInfo_ == null) {
      // Set the singleton identity
      await tran.put([...this.dbMatrixPath, gestaltIdentityKey], null);
    }
    // Updates the identity information
    await tran.put([...this.dbIdentitiesPath, gestaltIdentityKey], identityInfo);
    return gestaltIdentityId;
  }

  /**
   * This checks if the link node has matching issuer and subject.
   * It does not however verify the signatures.
   * Verifying signatures should be done before linking the nodes in the GG
   */
  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async linkNodeAndNode(
    nodeInfo1: GestaltNodeInfo,
    nodeInfo2: GestaltNodeInfo,
    linkNode: Omit<GestaltLinkNode, 'id'>,
    tran?: DBTransaction,
  ): Promise<GestaltLinkId> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.linkNodeAndNode(nodeInfo1, nodeInfo2, linkNode, tran),
      );
    }
    if (!gestaltsUtils.checkLinkNodeMatches(
      nodeInfo1.nodeId,
      nodeInfo2.nodeId,
      linkNode.claim.payload
    )) {
      throw new gestaltsErrors.ErrorGestaltsGraphLinkNodeMatch();
    }
    const nodeKey1 = gestaltsUtils.toGestaltNodeKey(
      ['node', nodeInfo1.nodeId],
    );
    const nodeKey2 = gestaltsUtils.toGestaltNodeKey(
      ['node', nodeInfo2.nodeId],
    );
    // If they are already connected, only update the link node
    const gestaltLinkIdBuffer = await tran.get(
      [
        ...this.dbMatrixPath,
        nodeKey1,
        nodeKey2
      ],
      true
    );
    if (gestaltLinkIdBuffer != null) {
      const gestaltLinkId = IdInternal.fromBuffer<GestaltLinkId>(gestaltLinkIdBuffer);
      await tran.put(
        [...this.dbLinksPath, gestaltLinkIdBuffer],
        [
          'node',
          {
            ...linkNode,
            id: gestaltLinkId,
          }
        ]
      );
      return gestaltLinkId;
    }
    // Check if the node infos are new
    let nodeNew1 = false;
    if (
      await tran.get<GestaltNodeInfoJSON>(
        [...this.dbNodesPath, nodeKey1]
      ) == null
    ) {
      nodeNew1 = true;
    }
    let nodeNew2 = false;
    if (
      await tran.get<GestaltNodeInfoJSON>(
        [...this.dbNodesPath, nodeKey2]
      ) == null
    ) {
      nodeNew2 = true;
    }
    // ACL changes depend on the situation:
    // if both node1 and node2 are new then
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
        [nodeInfo1.nodeId, nodeInfo2.nodeId],
        {
          gestalt: {},
          vaults: {},
        },
        tran,
      );
    } else if (!nodeNew1 && !nodeNew2) {
      // Get the gestalt for node 2
      const gestalt2 = (await this.getGestaltByKey(nodeKey1, undefined, tran))!;
      const nodeIds2 = Object.keys(gestalt2.nodes).map((gestaltNodeIdEncoded) => {
        return gestaltsUtils.decodeGestaltNodeId(gestaltNodeIdEncoded)![1];
      });
      // If the nodes exist in the gestalt, they must exist in the ACL
      const nodePerm1 = (await this.acl.getNodePerm(
        nodeInfo1.nodeId,
        tran,
      ))!;
      const nodePerm2 = (await this.acl.getNodePerm(
        nodeInfo2.nodeId,
        tran,
      ))!;
      // Union the perms together
      const permNew = aclUtils.permUnion(nodePerm1, nodePerm2);
      // Join node 2's gestalt permission with node 1
      // Node 1's gestalt permission is updated with the
      // union of both gestalt's permissions
      await this.acl.joinNodePerm(
        nodeInfo1.nodeId,
        nodeIds2,
        permNew,
        tran
      );
    } else if (nodeNew1 && !nodeNew2) {
      await this.acl.joinNodePerm(
        nodeInfo2.nodeId,
        [nodeInfo1.nodeId],
        undefined,
        tran,
      );
    } else if (!nodeNew1 && nodeNew2) {
      await this.acl.joinNodePerm(
        nodeInfo1.nodeId,
        [nodeInfo2.nodeId],
        undefined,
        tran,
      );
    }
    // Insert a new link node
    const gestaltLinkIdNew = this.generateGestaltLinkId();
    const gestaltLinkIdBufferNew = gestaltLinkIdNew.toBuffer();
    await tran.put(
      [...this.dbLinksPath, gestaltLinkIdBufferNew],
      [
        'node',
        {
          ...linkNode,
          id: gestaltLinkIdNew,
        }
      ]
    );
    // Link the nodes together
    await tran.put(
      [...this.dbMatrixPath, nodeKey1, nodeKey2],
      gestaltLinkIdBufferNew,
      true
    );
    await tran.put(
      [...this.dbMatrixPath, nodeKey2, nodeKey1],
      gestaltLinkIdBufferNew,
      true
    );
    // Remove any singleton entries
    await tran.del([...this.dbMatrixPath, nodeKey1]);
    await tran.del([...this.dbMatrixPath, nodeKey2]);
    // Upsert the node info
    await tran.put([...this.dbNodesPath, nodeKey1], nodeInfo1);
    await tran.put([...this.dbNodesPath, nodeKey2], nodeInfo2);
    return gestaltLinkIdNew;
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
    const nodeKey = gestaltsUtils.toGestaltKey(['node', nodeId]);
    return this.getGestaltByKey(nodeKey, undefined, tran);
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async getGestaltByIdentity(
    providerIdentityId: ProviderIdentityId,
    tran?: DBTransaction,
  ): Promise<Gestalt | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getGestaltByIdentity(providerIdentityId, tran),
      );
    }
    const identityKey = gestaltsUtils.toGestaltKey(['identity', providerIdentityId]);
    return this.getGestaltByKey(identityKey, undefined, tran);
  }


  // @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  // public async unsetIdentity(
  //   providerId: ProviderId,
  //   identityId: IdentityId,
  //   tran?: DBTransaction,
  // ) {
  //   if (tran == null) {
  //     return this.db.withTransactionF((tran) =>
  //       this.unsetIdentity(providerId, identityId, tran),
  //     );
  //   }
  //   const identityKey = gestaltsUtils.keyFromIdentity(providerId, identityId);
  //   const identityKeyPath = [
  //     ...this.gestaltGraphMatrixDbPath,
  //     identityKey,
  //   ] as unknown as KeyPath;
  //   const identityKeyKeys = await tran.get<GestaltKeySet>(identityKeyPath);
  //   if (identityKeyKeys == null) {
  //     return;
  //   }
  //   const identityPath = [
  //     ...this.gestaltGraphIdentitiesDbPath,
  //     identityKey,
  //   ] as unknown as KeyPath;
  //   await tran.del(identityPath);
  //   for (const key of Object.keys(identityKeyKeys) as Array<GestaltKey>) {
  //     const gId = gestaltsUtils.ungestaltKey(key);
  //     if (gId.type === 'node') {
  //       await this.unlinkNodeAndIdentity(
  //         nodesUtils.decodeNodeId(gId.nodeId)!,
  //         providerId,
  //         identityId,
  //         tran,
  //       );
  //     }
  //   }
  //   // Ensure that an empty key set is still deleted
  //   await tran.del(identityKeyPath);
  // }


  // /**
  //  * Removes a node in the graph
  //  * If this node exists, it will remove the node pointer
  //  * to the gestalt permission in the acl
  //  */
  // @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  // public async unsetNode(nodeId: NodeId, tran?: DBTransaction): Promise<void> {
  //   if (tran == null) {
  //     return this.db.withTransactionF((tran) => this.unsetNode(nodeId, tran));
  //   }
  //   const nodeKey = gestaltsUtils.keyFromNode(nodeId);
  //   const nodeKeyPath = [
  //     ...this.gestaltGraphMatrixDbPath,
  //     nodeKey,
  //   ] as unknown as KeyPath;
  //   const nodeKeyKeys = await tran.get<GestaltKeySet>(nodeKeyPath);
  //   if (nodeKeyKeys == null) {
  //     return;
  //   }
  //   const nodePath = [
  //     ...this.gestaltGraphNodesDbPath,
  //     nodeKey,
  //   ] as unknown as KeyPath;
  //   await tran.del(nodePath);
  //   for (const key of Object.keys(nodeKeyKeys) as Array<GestaltKey>) {
  //     const gId = gestaltsUtils.ungestaltKey(key);
  //     if (gId.type === 'node') {
  //       await this.unlinkNodeAndNode(
  //         nodeId,
  //         nodesUtils.decodeNodeId(gId.nodeId)!,
  //         tran,
  //       );
  //     } else if (gId.type === 'identity') {
  //       await this.unlinkNodeAndIdentity(
  //         nodeId,
  //         gId.providerId,
  //         gId.identityId,
  //         tran,
  //       );
  //     }
  //   }
  //   // Ensure that an empty key set is still deleted
  //   await tran.del(nodeKeyPath);
  //   // Unsets the gestalt in the acl
  //   // this must be done after all unlinking operations
  //   await this.acl.unsetNodePerm(nodeId, tran);
  // }

  // @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  // public async linkNodeAndIdentity(
  //   nodeInfo: NodeInfo,
  //   identityInfo: IdentityInfo,
  //   tran?: DBTransaction,
  // ): Promise<void> {
  //   if (tran == null) {
  //     return this.db.withTransactionF((tran) =>
  //       this.linkNodeAndIdentity(nodeInfo, identityInfo, tran),
  //     );
  //   }
  //   const nodeKey = gestaltsUtils.keyFromNode(
  //     nodesUtils.decodeNodeId(nodeInfo.id)!,
  //   );
  //   const identityKey = gestaltsUtils.keyFromIdentity(
  //     identityInfo.providerId,
  //     identityInfo.identityId,
  //   );
  //   const nodeKeyPath = [
  //     ...this.gestaltGraphMatrixDbPath,
  //     nodeKey,
  //   ] as unknown as KeyPath;
  //   const identityKeyPath = [
  //     ...this.gestaltGraphMatrixDbPath,
  //     identityKey,
  //   ] as unknown as KeyPath;
  //   let nodeKeyKeys = await tran.get<GestaltKeySet>(nodeKeyPath);
  //   let identityKeyKeys = await tran.get<GestaltKeySet>(identityKeyPath);
  //   // If they are already connected we do nothing
  //   if (
  //     nodeKeyKeys &&
  //     identityKey in nodeKeyKeys &&
  //     identityKeyKeys &&
  //     nodeKey in identityKeyKeys
  //   ) {
  //     return;
  //   }
  //   let nodeNew = false;
  //   if (nodeKeyKeys == null) {
  //     nodeNew = true;
  //     nodeKeyKeys = {};
  //   }
  //   let identityNew = false;
  //   if (identityKeyKeys == null) {
  //     identityNew = true;
  //     identityKeyKeys = {};
  //   }
  //   // Acl changes depend on the situation:
  //   // if both node and identity are new  then
  //   //   set a new permission for the node
  //   // if both node and identity exists then
  //   //   if the identity key set is empty then
  //   //     do nothing
  //   //   else
  //   //     join identity gestalt's permission to the node gestalt
  //   //     make sure to do a perm union
  //   // if node exists but identity is new then
  //   //   do nothing
  //   // if node is new but identity exists
  //   //   if the identity key set is empty then
  //   //     set a new permission for the node
  //   //   else
  //   //     join node gestalt's permission to the identity gestalt
  //   if (nodeNew && identityNew) {
  //     await this.acl.setNodePerm(
  //       nodesUtils.decodeNodeId(nodeInfo.id)!,
  //       {
  //         gestalt: {},
  //         vaults: {},
  //       },
  //       tran,
  //     );
  //   } else if (
  //     !nodeNew &&
  //     !identityNew &&
  //     !utils.isEmptyObject(identityKeyKeys)
  //   ) {
  //     const [, identityNodeKeys] = await this.traverseGestalt(
  //       Object.keys(identityKeyKeys) as Array<GestaltKey>,
  //       [identityKey],
  //       tran,
  //     );
  //     const identityNodeIds = Array.from(identityNodeKeys, (key) =>
  //       gestaltsUtils.nodeFromKey(key),
  //     );
  //     // These must exist
  //     const nodePerm = (await this.acl.getNodePerm(
  //       nodesUtils.decodeNodeId(nodeInfo.id)!,
  //       tran,
  //     )) as Permission;
  //     const identityPerm = (await this.acl.getNodePerm(
  //       identityNodeIds[0],
  //       tran,
  //     )) as Permission;
  //     // Union the perms together
  //     const permNew = aclUtils.permUnion(nodePerm, identityPerm);
  //     // Node perm is updated and identity perm is joined to node perm
  //     // this has to be done as 1 call to acl in order to combine ref count update
  //     // and the perm record update
  //     await this.acl.joinNodePerm(
  //       nodesUtils.decodeNodeId(nodeInfo.id)!,
  //       identityNodeIds,
  //       permNew,
  //       tran,
  //     );
  //   } else if (nodeNew && !identityNew) {
  //     if (utils.isEmptyObject(identityKeyKeys)) {
  //       await this.acl.setNodePerm(
  //         nodesUtils.decodeNodeId(nodeInfo.id)!,
  //         {
  //           gestalt: {},
  //           vaults: {},
  //         },
  //         tran,
  //       );
  //     } else {
  //       let identityNodeKey: GestaltNodeKey;
  //       for (const gK in identityKeyKeys) {
  //         identityNodeKey = gK as GestaltNodeKey;
  //         break;
  //       }
  //       const identityNodeId = gestaltsUtils.nodeFromKey(identityNodeKey!);
  //       await this.acl.joinNodePerm(
  //         identityNodeId,
  //         [nodesUtils.decodeNodeId(nodeInfo.id)!],
  //         undefined,
  //         tran,
  //       );
  //     }
  //   }
  //   nodeKeyKeys[identityKey] = null;
  //   identityKeyKeys[nodeKey] = null;
  //   await tran.put(nodeKeyPath, nodeKeyKeys);
  //   await tran.put(identityKeyPath, identityKeyKeys);
  //   const nodePath = [
  //     ...this.gestaltGraphNodesDbPath,
  //     nodeKey,
  //   ] as unknown as KeyPath;
  //   await tran.put(nodePath, nodeInfo);
  //   const identityPath = [
  //     ...this.gestaltGraphIdentitiesDbPath,
  //     identityKey,
  //   ] as unknown as KeyPath;
  //   await tran.put(identityPath, identityInfo);
  // }


  // @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  // public async unlinkNodeAndIdentity(
  //   nodeId: NodeId,
  //   providerId: ProviderId,
  //   identityId: IdentityId,
  //   tran?: DBTransaction,
  // ): Promise<void> {
  //   if (tran == null) {
  //     return this.db.withTransactionF((tran) =>
  //       this.unlinkNodeAndIdentity(nodeId, providerId, identityId, tran),
  //     );
  //   }
  //   const nodeKey = gestaltsUtils.keyFromNode(nodeId);
  //   const identityKey = gestaltsUtils.keyFromIdentity(providerId, identityId);
  //   const nodeKeyPath = [
  //     ...this.gestaltGraphMatrixDbPath,
  //     nodeKey,
  //   ] as unknown as KeyPath;
  //   const identityKeyPath = [
  //     ...this.gestaltGraphMatrixDbPath,
  //     identityKey,
  //   ] as unknown as KeyPath;
  //   const nodeKeyKeys = await tran.get<GestaltKeySet>(nodeKeyPath);
  //   const identityKeyKeys = await tran.get<GestaltKeySet>(identityKeyPath);
  //   let unlinking = false;
  //   if (nodeKeyKeys && identityKey in nodeKeyKeys) {
  //     unlinking = true;
  //     delete nodeKeyKeys[identityKey];
  //     await tran.put(nodeKeyPath, nodeKeyKeys);
  //   }
  //   if (identityKeyKeys && nodeKey in identityKeyKeys) {
  //     unlinking = true;
  //     delete identityKeyKeys[nodeKey];
  //     await tran.put(identityKeyPath, identityKeyKeys);
  //   }
  //   if (nodeKeyKeys && identityKeyKeys && unlinking) {
  //     // Check if the gestalts have split
  //     // if so, the node gestalt will inherit a new copy of the permission
  //     const [, gestaltNodeKeys, gestaltIdentityKeys] =
  //       await this.traverseGestalt(
  //         Object.keys(nodeKeyKeys) as Array<GestaltKey>,
  //         [nodeKey],
  //         tran,
  //       );
  //     if (!gestaltIdentityKeys.has(identityKey)) {
  //       const nodeIds = Array.from(gestaltNodeKeys, (key) =>
  //         gestaltsUtils.nodeFromKey(key),
  //       );
  //       // It is assumed that an existing gestalt has a permission
  //       const perm = (await this.acl.getNodePerm(nodeId, tran)) as Permission;
  //       // This remaps all existing nodes to a new permission
  //       await this.acl.setNodesPerm(nodeIds, perm, tran);
  //     }
  //   }
  // }

  // @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  // public async unlinkNodeAndNode(
  //   nodeId1: NodeId,
  //   nodeId2: NodeId,
  //   tran?: DBTransaction,
  // ): Promise<void> {
  //   if (tran == null) {
  //     return this.db.withTransactionF((tran) =>
  //       this.unlinkNodeAndNode(nodeId1, nodeId2, tran),
  //     );
  //   }
  //   const nodeKey1 = gestaltsUtils.keyFromNode(nodeId1);
  //   const nodeKey2 = gestaltsUtils.keyFromNode(nodeId2);
  //   const nodeKey1Path = [
  //     ...this.gestaltGraphMatrixDbPath,
  //     nodeKey1,
  //   ] as unknown as KeyPath;
  //   const nodeKey2Path = [
  //     ...this.gestaltGraphMatrixDbPath,
  //     nodeKey2,
  //   ] as unknown as KeyPath;
  //   const nodeKeyKeys1 = await tran.get<GestaltKeySet>(nodeKey1Path);
  //   const nodeKeyKeys2 = await tran.get<GestaltKeySet>(nodeKey2Path);
  //   let unlinking = false;
  //   if (nodeKeyKeys1 && nodeKey2 in nodeKeyKeys1) {
  //     unlinking = true;
  //     delete nodeKeyKeys1[nodeKey2];
  //     await tran.put(nodeKey1Path, nodeKeyKeys1);
  //   }
  //   if (nodeKeyKeys2 && nodeKey1 in nodeKeyKeys2) {
  //     unlinking = true;
  //     delete nodeKeyKeys2[nodeKey1];
  //     await tran.put(nodeKey2Path, nodeKeyKeys2);
  //   }
  //   if (nodeKeyKeys1 && nodeKeyKeys2 && unlinking) {
  //     // Check if the gestalts have split
  //     // if so, the node gestalt will inherit a new copy of the permission
  //     const [, gestaltNodeKeys] = await this.traverseGestalt(
  //       Object.keys(nodeKeyKeys1) as Array<GestaltKey>,
  //       [nodeKey1],
  //       tran,
  //     );
  //     if (!gestaltNodeKeys.has(nodeKey2)) {
  //       const nodeIds = Array.from(gestaltNodeKeys, (key) =>
  //         gestaltsUtils.nodeFromKey(key),
  //       );
  //       // It is assumed that an existing gestalt has a permission
  //       const perm = (await this.acl.getNodePerm(nodeId1, tran)) as Permission;
  //       // This remaps all existing nodes to a new permission
  //       await this.acl.setNodesPerm(nodeIds, perm, tran);
  //     }
  //   }
  // }

  // @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  // public async getGestaltActionsByNode(
  //   nodeId: NodeId,
  //   tran?: DBTransaction,
  // ): Promise<GestaltActions | undefined> {
  //   if (tran == null) {
  //     return this.db.withTransactionF((tran) =>
  //       this.getGestaltActionsByNode(nodeId, tran),
  //     );
  //   }
  //   const nodeKey = gestaltsUtils.keyFromNode(nodeId);
  //   const nodeKeyPath = [
  //     ...this.gestaltGraphNodesDbPath,
  //     nodeKey,
  //   ] as unknown as KeyPath;
  //   if ((await tran.get<NodeInfo>(nodeKeyPath)) == null) {
  //     return;
  //   }
  //   const perm = await this.acl.getNodePerm(nodeId, tran);
  //   if (perm == null) {
  //     return;
  //   }
  //   return perm.gestalt;
  // }

  // @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  // public async getGestaltActionsByIdentity(
  //   providerId: ProviderId,
  //   identityId: IdentityId,
  //   tran?: DBTransaction,
  // ): Promise<GestaltActions | undefined> {
  //   if (tran == null) {
  //     return this.db.withTransactionF((tran) =>
  //       this.getGestaltActionsByIdentity(providerId, identityId, tran),
  //     );
  //   }
  //   const identityKey = gestaltsUtils.keyFromIdentity(providerId, identityId);
  //   const identityKeyPath = [
  //     ...this.gestaltGraphIdentitiesDbPath,
  //     identityKey,
  //   ] as unknown as KeyPath;
  //   if ((await tran.get<IdentityInfo>(identityKeyPath)) == null) {
  //     return;
  //   }
  //   const gestaltKeyPath = [
  //     ...this.gestaltGraphMatrixDbPath,
  //     identityKey,
  //   ] as unknown as KeyPath;
  //   const gestaltKeySet = (await tran.get<GestaltKeySet>(
  //     gestaltKeyPath,
  //   )) as GestaltKeySet;
  //   let nodeId: NodeId | undefined;
  //   for (const nodeKey in gestaltKeySet) {
  //     nodeId = gestaltsUtils.nodeFromKey(nodeKey as GestaltNodeKey);
  //     break;
  //   }
  //   if (nodeId == null) {
  //     return;
  //   }
  //   const perm = await this.acl.getNodePerm(nodeId, tran);
  //   if (perm == null) {
  //     return;
  //   }
  //   return perm.gestalt;
  // }

  // @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  // public async setGestaltActionByNode(
  //   nodeId: NodeId,
  //   action: GestaltAction,
  //   tran?: DBTransaction,
  // ): Promise<void> {
  //   if (tran == null) {
  //     return this.db.withTransactionF((tran) =>
  //       this.setGestaltActionByNode(nodeId, action, tran),
  //     );
  //   }
  //   const nodeKey = gestaltsUtils.keyFromNode(nodeId);
  //   const nodeKeyPath = [
  //     ...this.gestaltGraphNodesDbPath,
  //     nodeKey,
  //   ] as unknown as KeyPath;
  //   if ((await tran.get<NodeInfo>(nodeKeyPath)) == null) {
  //     throw new gestaltsErrors.ErrorGestaltsGraphNodeIdMissing();
  //   }
  //   await this.acl.setNodeAction(nodeId, action, tran);
  // }

  // @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  // public async setGestaltActionByIdentity(
  //   providerId: ProviderId,
  //   identityId: IdentityId,
  //   action: GestaltAction,
  //   tran?: DBTransaction,
  // ): Promise<void> {
  //   if (tran == null) {
  //     return this.db.withTransactionF((tran) =>
  //       this.setGestaltActionByIdentity(providerId, identityId, action, tran),
  //     );
  //   }
  //   const identityKey = gestaltsUtils.keyFromIdentity(providerId, identityId);
  //   const identityKeyPath = [
  //     ...this.gestaltGraphIdentitiesDbPath,
  //     identityKey,
  //   ] as unknown as KeyPath;
  //   if ((await tran.get<IdentityInfo>(identityKeyPath)) == null) {
  //     throw new gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing();
  //   }
  //   const gestaltKeyPath = [
  //     ...this.gestaltGraphMatrixDbPath,
  //     identityKey,
  //   ] as unknown as KeyPath;
  //   const gestaltKeySet = (await tran.get(gestaltKeyPath)) as GestaltKeySet;
  //   let nodeId: NodeId | undefined;
  //   for (const nodeKey in gestaltKeySet) {
  //     nodeId = gestaltsUtils.nodeFromKey(nodeKey as GestaltNodeKey);
  //     break;
  //   }
  //   // If there are no linked nodes, this cannot proceed
  //   if (nodeId == null) {
  //     throw new gestaltsErrors.ErrorGestaltsGraphNodeIdMissing();
  //   }
  //   await this.acl.setNodeAction(nodeId, action, tran);
  // }

  // @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  // public async unsetGestaltActionByNode(
  //   nodeId: NodeId,
  //   action: GestaltAction,
  //   tran?: DBTransaction,
  // ): Promise<void> {
  //   if (tran == null) {
  //     return this.db.withTransactionF((tran) =>
  //       this.unsetGestaltActionByNode(nodeId, action, tran),
  //     );
  //   }
  //   const nodeKey = gestaltsUtils.keyFromNode(nodeId);
  //   const nodeKeyPath = [
  //     ...this.gestaltGraphNodesDbPath,
  //     nodeKey,
  //   ] as unknown as KeyPath;
  //   if ((await tran.get<NodeInfo>(nodeKeyPath)) == null) {
  //     throw new gestaltsErrors.ErrorGestaltsGraphNodeIdMissing();
  //   }
  //   await this.acl.unsetNodeAction(nodeId, action, tran);
  // }

  // @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  // public async unsetGestaltActionByIdentity(
  //   providerId: ProviderId,
  //   identityId: IdentityId,
  //   action: GestaltAction,
  //   tran?: DBTransaction,
  // ): Promise<void> {
  //   if (tran == null) {
  //     return this.db.withTransactionF((tran) =>
  //       this.unsetGestaltActionByIdentity(providerId, identityId, action, tran),
  //     );
  //   }
  //   const identityKey = gestaltsUtils.keyFromIdentity(providerId, identityId);
  //   const identityKeyPath = [
  //     ...this.gestaltGraphIdentitiesDbPath,
  //     identityKey,
  //   ] as unknown as KeyPath;
  //   if ((await tran.get<IdentityInfo>(identityKeyPath)) == null) {
  //     throw new gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing();
  //   }
  //   const gestaltKeyPath = [
  //     ...this.gestaltGraphMatrixDbPath,
  //     identityKey,
  //   ] as unknown as KeyPath;
  //   const gestaltKeySet = (await tran.get(gestaltKeyPath)) as GestaltKeySet;
  //   let nodeId: NodeId | undefined;
  //   for (const nodeKey in gestaltKeySet) {
  //     nodeId = gestaltsUtils.nodeFromKey(nodeKey as GestaltNodeKey);
  //     break;
  //   }
  //   // If there are no linked nodes, this cannot proceed
  //   if (nodeId == null) {
  //     throw new gestaltsErrors.ErrorGestaltsGraphNodeIdMissing();
  //   }
  //   await this.acl.unsetNodeAction(nodeId, action, tran);
  // }


  /**
   * Gets a gestalt using BFS.
   * During execution the`visited` set indicates the vertexes that have been queued.
   * This BFS algorithm has to 2 stages:
   *   1. processing the vertex information.
   *   2. processing the vertex links by iterating the vertex neighbours.
   * When processing vertex information we need to avoid queued duplicate vertexes.
   * When processing vertex links we need to avoid already processed links.
   * When finished, the `visited` set indicates the vertexes that have been processed.
   */
  protected async getGestaltByKey(
    gestaltKey: GestaltKey,
    visited: Set<string> = new Set(),
    tran: DBTransaction
  ): Promise<Gestalt | undefined> {
    const nodeInfoJSON = await tran.get<GestaltNodeInfoJSON>([...this.dbNodesPath, gestaltKey]);
    const identityInfo = await tran.get<GestaltIdentityInfo>([...this.dbIdentitiesPath, gestaltKey]);
    if (nodeInfoJSON == null && identityInfo == null) {
      return;
    }
    const gestalt = {
      matrix: {},
      nodes: {},
      identities: {}
    };
    const queue = [gestaltKey];
    visited.add(gestaltKey.toString('binary'));
    while (true) {
      const gestaltKey = queue.shift();
      if (gestaltKey == null) {
        break;
      }
      const gestaltId = gestaltsUtils.fromGestaltKey(gestaltKey);
      const gestaltIdEncoded = gestaltsUtils.encodeGestaltId(gestaltId);
      // Process the vertex's node info or identity info
      if (gestaltId[0] === 'node') {
        const gestaltNodeInfoJSON = (await tran.get<GestaltNodeInfoJSON>(
          [...this.dbNodesPath, gestaltKey],
        ))!;
        const gestaltNodeInfo = gestaltsUtils.fromGestaltNodeInfoJSON(gestaltNodeInfoJSON);
        gestalt.nodes[gestaltIdEncoded] = gestaltNodeInfo;
      } else if (gestaltId[0] === 'identity') {
        const gestaltIdentityInfo = (await tran.get<GestaltIdentityInfo>(
          [...this.dbIdentitiesPath, gestaltKey],
        ))!;
        gestalt.identities[gestaltIdEncoded] = gestaltIdentityInfo;
      }
      // Singleton gestalts will just have an empty record
      gestalt.matrix[gestaltIdEncoded] ??= {};
      for await (const [
        [gestaltKeyNeighbour],
        gestaltLinkIdBuffer
      ] of tran.iterator(
        [...this.dbMatrixPath, gestaltKey]
      ) as DBIterator<Array<GestaltKey>, Buffer>) {
        const gestaltIdNeighbour = gestaltsUtils.fromGestaltKey(
          gestaltKeyNeighbour
        );
        const gestaltIdEncodedNeighbour = gestaltsUtils.encodeGestaltId(
          gestaltIdNeighbour
        );
        // Skip processing neighbours that have already been processed
        if (
          gestalt.matrix[gestaltIdEncoded][gestaltIdEncodedNeighbour] != null
        ) {
          continue;
        }
        gestalt.matrix[gestaltIdEncodedNeighbour] ??= {};
        const gestaltLink = (await tran.get<GestaltLink>([
          ...this.dbLinksPath,
          gestaltLinkIdBuffer
        ]))!;
        gestalt.matrix[gestaltIdEncoded][gestaltIdEncodedNeighbour] = gestaltLink;
        gestalt.matrix[gestaltIdEncodedNeighbour][gestaltIdEncoded] = gestaltLink;
        // Only queue the vertexes that aren't already queued
        if (!visited.has(gestaltKeyNeighbour.toString('binary'))) {
          queue.push(gestaltKeyNeighbour);
          visited.add(gestaltKeyNeighbour.toString('binary'));
        }
      }
    }
    return gestalt;
  }
}

export default GestaltGraph;
