import type { DB, DBIterator, DBTransaction, LevelPath } from '@matrixai/db';
import type {
  Gestalt,
  GestaltAction,
  GestaltActions,
  GestaltKey,
  GestaltLinkId,
  GestaltNodeInfo,
  GestaltNodeInfoJSON,
  GestaltIdentityInfo,
  GestaltLink,
  GestaltLinkNode,
  GestaltInfo,
  GestaltLinkIdentity,
  GestaltId,
} from './types';
import type { NodeId, ProviderIdentityId } from '../ids/types';
import type ACL from '../acl/ACL';
import type { GestaltLinkJSON } from './types';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { IdInternal } from '@matrixai/id';
import * as gestaltsUtils from './utils';
import * as gestaltsErrors from './errors';
import * as aclUtils from '../acl/utils';
import { never } from '../utils';

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
  public readonly dbMatrixPath: Readonly<LevelPath> = [
    this.constructor.name,
    'matrix',
  ];

  /**
   * Gestalt links.
   * `GestaltGraph/links/{GestaltLinkId} -> {json(GestaltLink)}`
   */
  public readonly dbLinksPath: Readonly<LevelPath> = [
    this.constructor.name,
    'links',
  ];

  /**
   * Node information
   * `GestaltGraph/nodes/{GestaltKey} -> {json(GestaltNodeInfo)}`
   */
  public readonly dbNodesPath: Readonly<LevelPath> = [
    this.constructor.name,
    'nodes',
  ];

  /**
   * Identity information
   * `GestaltGraph/identities/{GestaltKey} -> {json(GestaltIdentityInfo)}`
   */
  public readonly dbIdentitiesPath: LevelPath = [
    this.constructor.name,
    'identities',
  ];

  protected generateGestaltLinkId: () => GestaltLinkId;

  constructor({ db, acl, logger }: { db: DB; acl: ACL; logger: Logger }) {
    this.logger = logger;
    this.db = db;
    this.acl = acl;
  }

  public async start({ fresh = false }: { fresh?: boolean } = {}) {
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      await this.db.clear(this.dbPath);
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

  // Getting and setting vertices

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
    const gestaltNodeKey = gestaltsUtils.toGestaltNodeKey(gestaltNodeId);
    const nodeInfoJSON = await tran.get<GestaltNodeInfoJSON>([
      ...this.dbNodesPath,
      gestaltNodeKey,
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
      [identityInfo.providerId, identityInfo.identityId],
    ] as ['identity', ProviderIdentityId];
    const gestaltIdentityKey =
      gestaltsUtils.toGestaltIdentityKey(gestaltIdentityId);
    const identityInfo_ = await tran.get<GestaltIdentityInfo>([
      ...this.dbIdentitiesPath,
      gestaltIdentityKey,
    ]);
    if (identityInfo_ == null) {
      // Set the singleton identity
      await tran.put([...this.dbMatrixPath, gestaltIdentityKey], null);
    }
    // Updates the identity information
    await tran.put(
      [...this.dbIdentitiesPath, gestaltIdentityKey],
      identityInfo,
    );
    return gestaltIdentityId;
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unsetNode(nodeId: NodeId, tran?: DBTransaction): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.unsetNode(nodeId, tran));
    }
    const gestaltKey1 = gestaltsUtils.toGestaltNodeKey(['node', nodeId]);
    // Remove the singleton gestalt if it exists
    await tran.del([...this.dbMatrixPath, gestaltKey1]);
    // Unlink all neighbours, this will iterate over singletons because it is already removed
    for await (const [keyPath, value] of tran.iterator(
      [...this.dbMatrixPath, gestaltKey1],
      { values: false },
    )) {
      if (value == null) continue;
      const [, gestaltKey2] = keyPath as [GestaltKey, GestaltKey];
      const gestaltId2 = gestaltsUtils.fromGestaltKey(gestaltKey2);
      if (gestaltId2[0] === 'node') {
        // The first gestalt preserves the same permission ID
        // thes second gestalt gets a new permission ID
        await this.unlinkNodeAndNode(gestaltId2[1], nodeId, tran);
      } else if (gestaltId2[0] === 'identity') {
        await this.unlinkNodeAndIdentity(nodeId, gestaltId2[1], tran);
      }
    }
    // Remove the node information
    await tran.del([...this.dbNodesPath, gestaltKey1]);
    // Remove the permissions
    await this.acl.unsetNodePerm(nodeId, tran);
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unsetIdentity(
    providerIdentityId: ProviderIdentityId,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.unsetIdentity(providerIdentityId, tran),
      );
    }
    // When a vertex is unset, their permissions in the ACL must be deleted,
    //  and all their links must also be broken. This means you have to iterate
    //  over all its neighbours and remove those entries in matrix. But you must
    //  also remove themselves from the matrix if they are a singleton gestalt.
    const gestaltIdentityKey = gestaltsUtils.toGestaltIdentityKey([
      'identity',
      providerIdentityId,
    ]);
    // 1. Iterate over all links and delete them
    for await (const [keyPath, gestaltLinkIdBuffer] of tran.iterator(
      [...this.dbMatrixPath, gestaltIdentityKey],
      { valueAsBuffer: true },
    )) {
      // We want to delete each link but also the reverse link
      if (gestaltLinkIdBuffer == null) continue;
      const linkedGestaltIdKey = keyPath[keyPath.length - 1] as GestaltKey;
      const [type, id] = gestaltsUtils.fromGestaltKey(linkedGestaltIdKey);
      switch (type) {
        case 'node':
          await this.unlinkNodeAndIdentity(id, providerIdentityId, tran);
          break;
        case 'identity':
        default:
          never();
      }
    }
    // 2. remove the node information.
    await tran.del([...this.dbIdentitiesPath, gestaltIdentityKey]);
  }

  // Calls one of `setNode` or `setIdentity`
  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public setVertex(
    gestaltInfo: GestaltInfo,
    tran?: DBTransaction,
  ): Promise<GestaltId> {
    const [type, info] = gestaltInfo;
    switch (type) {
      case 'node':
        return this.setNode(info, tran);
      case 'identity':
        return this.setIdentity(info, tran);
      default:
        never();
    }
  }

  // Calls one of `unsetNode` or `unsetIdentity`
  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public unsetVertex(
    gestaltId: GestaltId,
    tran?: DBTransaction,
  ): Promise<void> {
    const [type, id] = gestaltId;
    switch (type) {
      case 'node':
        return this.unsetNode(id, tran);
      case 'identity':
        return this.unsetIdentity(id, tran);
      default:
        never();
    }
  }

  // LINKING AND UNLINKING VERTICES

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
    if (
      !gestaltsUtils.checkLinkNodeMatches(
        nodeInfo1.nodeId,
        nodeInfo2.nodeId,
        linkNode.claim.payload,
      )
    ) {
      throw new gestaltsErrors.ErrorGestaltsGraphLinkNodeMatch();
    }
    const nodeKey1 = gestaltsUtils.toGestaltNodeKey(['node', nodeInfo1.nodeId]);
    const nodeKey2 = gestaltsUtils.toGestaltNodeKey(['node', nodeInfo2.nodeId]);
    // If they are already connected, only update the link node
    const gestaltLinkIdBuffer = await tran.get(
      [...this.dbMatrixPath, nodeKey1, nodeKey2],
      true,
    );
    if (gestaltLinkIdBuffer != null) {
      const gestaltLinkId =
        IdInternal.fromBuffer<GestaltLinkId>(gestaltLinkIdBuffer);
      await tran.put(
        [...this.dbLinksPath, gestaltLinkIdBuffer],
        [
          'node',
          {
            ...linkNode,
            id: gestaltLinkId,
          },
        ],
      );
      return gestaltLinkId;
    }
    // Check if the node infos are new
    let nodeNew1 = false;
    if (
      (await tran.get<GestaltNodeInfoJSON>([...this.dbNodesPath, nodeKey1])) ==
      null
    ) {
      nodeNew1 = true;
    }
    let nodeNew2 = false;
    if (
      (await tran.get<GestaltNodeInfoJSON>([...this.dbNodesPath, nodeKey2])) ==
      null
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
      const nodeIds2 = Object.keys(gestalt2.nodes).map(
        (gestaltNodeIdEncoded) => {
          return gestaltsUtils.decodeGestaltNodeId(gestaltNodeIdEncoded)![1];
        },
      );
      // If the nodes exist in the gestalt, they must exist in the ACL
      const nodePerm1 = (await this.acl.getNodePerm(nodeInfo1.nodeId, tran))!;
      const nodePerm2 = (await this.acl.getNodePerm(nodeInfo2.nodeId, tran))!;
      // Union the perms together
      const permNew = aclUtils.permUnion(nodePerm1, nodePerm2);
      // Join node 2's gestalt permission with node 1
      // Node 1's gestalt permission is updated with the
      // union of both gestalt's permissions
      await this.acl.joinNodePerm(nodeInfo1.nodeId, nodeIds2, permNew, tran);
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
        },
      ],
    );
    // Link the nodes together
    await tran.put(
      [...this.dbMatrixPath, nodeKey1, nodeKey2],
      gestaltLinkIdBufferNew,
      true,
    );
    await tran.put(
      [...this.dbMatrixPath, nodeKey2, nodeKey1],
      gestaltLinkIdBufferNew,
      true,
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
  public async linkNodeAndIdentity(
    nodeInfo: GestaltNodeInfo,
    identityInfo: GestaltIdentityInfo,
    linkIdentity: Omit<GestaltLinkIdentity, 'id'>,
    tran?: DBTransaction,
  ): Promise<GestaltLinkId> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.linkNodeAndIdentity(nodeInfo, identityInfo, linkIdentity, tran),
      );
    }
    if (
      !gestaltsUtils.checkLinkIdentityMatches(
        nodeInfo.nodeId,
        [identityInfo.providerId, identityInfo.identityId],
        linkIdentity.claim.payload,
      )
    ) {
      throw new gestaltsErrors.ErrorGestaltsGraphLinkIdentityMatch();
    }
    const nodeKey = gestaltsUtils.toGestaltNodeKey(['node', nodeInfo.nodeId]);
    const identityKey = gestaltsUtils.toGestaltIdentityKey([
      'identity',
      [identityInfo.providerId, identityInfo.identityId],
    ]);
    // If they are already connected, only update the link identity
    const gestaltLinkIdBuffer = await tran.get(
      [...this.dbMatrixPath, nodeKey, identityKey],
      true,
    );
    if (gestaltLinkIdBuffer != null) {
      const gestaltLinkId =
        IdInternal.fromBuffer<GestaltLinkId>(gestaltLinkIdBuffer);
      await tran.put(
        [...this.dbLinksPath, gestaltLinkIdBuffer],
        [
          'identity',
          {
            ...linkIdentity,
            id: gestaltLinkId,
          },
        ],
      );
      return gestaltLinkId;
    }
    // Check if the infos are new
    let nodeNew = false;
    if (
      (await tran.get<GestaltNodeInfoJSON>([...this.dbNodesPath, nodeKey])) ==
      null
    ) {
      nodeNew = true;
    }
    const identityLinkedNodeId = await this.getIdentityLinkedNodeId(
      [identityInfo.providerId, identityInfo.identityId],
      tran,
    );
    // ACL changes depend on the situation:
    // If the node and identity is new
    //   then the node needs a new permission
    // If both node and identity exist then the node needs to union
    //   join identity's linked node gestalt's permission to the node 1 gestalt
    //   make sure to do a perm union
    // If just the node is new
    //   join the node gestalt's permission to the identity's linked node gestalt
    // If just the identity is new
    //   then no permission changes are needed
    if (nodeNew && identityLinkedNodeId == null) {
      await this.acl.setNodePerm(
        nodeInfo.nodeId,
        {
          gestalt: {},
          vaults: {},
        },
        tran,
      );
    } else if (!nodeNew && identityLinkedNodeId != null) {
      // Get the gestalt for node 2
      const gestalt2 = (await this.getGestaltByKey(nodeKey, undefined, tran))!;
      const nodeIds2 = Object.keys(gestalt2.nodes).map(
        (gestaltNodeIdEncoded) => {
          return gestaltsUtils.decodeGestaltNodeId(gestaltNodeIdEncoded)![1];
        },
      );
      // If the nodes exist in the gestalt, they must exist in the ACL
      const nodePerm1 = (await this.acl.getNodePerm(nodeInfo.nodeId, tran))!;
      const nodePerm2 = (await this.acl.getNodePerm(
        identityLinkedNodeId,
        tran,
      ))!;
      // Union the perms together
      const permNew = aclUtils.permUnion(nodePerm1, nodePerm2);
      // Join node 2's gestalt permission with node 1
      // Node 1's gestalt permission is updated with the
      // union of both gestalt's permissions
      await this.acl.joinNodePerm(nodeInfo.nodeId, nodeIds2, permNew, tran);
    } else if (nodeNew && identityLinkedNodeId != null) {
      await this.acl.joinNodePerm(
        identityLinkedNodeId,
        [nodeInfo.nodeId],
        undefined,
        tran,
      );
    } else if (!nodeNew && identityLinkedNodeId == null) {
      // Do nothing
    }

    // Insert a new link node
    const gestaltLinkIdNew = this.generateGestaltLinkId();
    const gestaltLinkIdBufferNew = gestaltLinkIdNew.toBuffer();
    await tran.put(
      [...this.dbLinksPath, gestaltLinkIdBufferNew],
      [
        'identity',
        {
          ...linkIdentity,
          id: gestaltLinkIdNew,
        },
      ],
    );
    // Link the node and identity together
    await tran.put(
      [...this.dbMatrixPath, nodeKey, identityKey],
      gestaltLinkIdBufferNew,
      true,
    );
    await tran.put(
      [...this.dbMatrixPath, identityKey, nodeKey],
      gestaltLinkIdBufferNew,
      true,
    );
    // Remove any singleton entries
    await tran.del([...this.dbMatrixPath, nodeKey]);
    await tran.del([...this.dbMatrixPath, identityKey]);
    // Upsert the node and identity info
    await tran.put([...this.dbNodesPath, nodeKey], nodeInfo);
    await tran.put([...this.dbIdentitiesPath, identityKey], identityInfo);
    return gestaltLinkIdNew;
  }

  public linkVertexAndVertex(
    gestaltInfo1: ['node', GestaltNodeInfo],
    gestaltInfo2: ['node', GestaltNodeInfo],
    link: ['node', Omit<GestaltLinkNode, 'id'>],
    tran?: DBTransaction,
  ): Promise<GestaltLinkId>;
  public linkVertexAndVertex(
    gestaltInfo1: ['node', GestaltNodeInfo],
    gestaltInfo2: ['identity', GestaltIdentityInfo],
    link: ['identity', Omit<GestaltLinkIdentity, 'id'>],
    tran?: DBTransaction,
  ): Promise<GestaltLinkId>;
  public linkVertexAndVertex(
    gestaltInfo1: ['identity', GestaltIdentityInfo],
    gestaltInfo2: ['node', GestaltNodeInfo],
    link: ['identity', Omit<GestaltLinkIdentity, 'id'>],
    tran?: DBTransaction,
  ): Promise<GestaltLinkId>;
  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public linkVertexAndVertex(
    gestaltInfo1: GestaltInfo,
    gestaltInfo2: GestaltInfo,
    link: [GestaltLink[0], Omit<GestaltLink[1], 'id'>],
    tran?: DBTransaction,
  ): Promise<GestaltLinkId> {
    if (gestaltInfo1[0] === 'node' && gestaltInfo2[0] === 'node') {
      return this.linkNodeAndNode(
        gestaltInfo1[1],
        gestaltInfo2[1],
        link[1] as Omit<GestaltLinkNode, 'id'>,
        tran,
      );
    } else if (gestaltInfo1[0] === 'node' && gestaltInfo2[0] === 'identity') {
      return this.linkNodeAndIdentity(
        gestaltInfo1[1],
        gestaltInfo2[1],
        link[1] as Omit<GestaltLinkIdentity, 'id'>,
        tran,
      );
    } else if (gestaltInfo1[0] === 'identity' && gestaltInfo2[0] === 'node') {
      return this.linkNodeAndIdentity(
        gestaltInfo2[1],
        gestaltInfo1[1],
        link[1] as Omit<GestaltLinkIdentity, 'id'>,
        tran,
      );
    } else {
      never();
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
    // Unlinking needs to do the following:
    // 1. check if both nodes exist as verticies
    // 2. check if the link exists between them
    // 3. remove the link between them
    // 5. Check if any of the vertices became a singleton
    // 4. check if the gestalt splits into two separate gestalts and copy the
    //  permissions between them.
    const nodeKey1 = gestaltsUtils.toGestaltNodeKey(['node', nodeId1]);
    const nodeKey2 = gestaltsUtils.toGestaltNodeKey(['node', nodeId2]);
    // Checking if the vertices exist
    if ((await tran.get([...this.dbNodesPath, nodeKey1], true)) == null) return;
    if ((await tran.get([...this.dbNodesPath, nodeKey2], true)) == null) return;
    // Checking if the link exists
    const linkId = await tran.get(
      [...this.dbMatrixPath, nodeKey1, nodeKey2],
      true,
    );
    if (linkId == null) return;
    // Remove the link
    await tran.del([...this.dbLinksPath, linkId]);
    await tran.del([...this.dbMatrixPath, nodeKey1, nodeKey2]);
    await tran.del([...this.dbMatrixPath, nodeKey2, nodeKey1]);
    // We check this by iterating over the links in the matrix.
    let nodeNeighbors1 = false;
    for await (const _ of tran.iterator([...this.dbMatrixPath, nodeKey1], {
      limit: 1,
    })) {
      nodeNeighbors1 = true;
    }
    // Set as a singleton
    if (!nodeNeighbors1) await tran.put([...this.dbMatrixPath, nodeKey1], null);
    let nodeNeighbors2 = false;
    for await (const _ of tran.iterator([...this.dbMatrixPath, nodeKey2], {
      limit: 1,
    })) {
      nodeNeighbors2 = true;
    }
    // Set as a singleton
    if (!nodeNeighbors2) await tran.put([...this.dbMatrixPath, nodeKey2], null);
    // Check if the gestalt was split in two
    const gestalt = (await this.getGestaltByKey(nodeKey1, undefined, tran))!;
    const nodeKeyEncoded2 = gestaltsUtils.encodeGestaltNodeId([
      'node',
      nodeId2,
    ]);
    // If the nodes are part of the same gestalt then do nothing to the permissions
    if (gestalt.nodes[nodeKeyEncoded2] != null) return;
    // Need to copy the ACL permissions between the two gestalts
    const nodeIds = Object.keys(gestalt.nodes).map(
      (nodeIdEncoded) => gestaltsUtils.decodeGestaltNodeId(nodeIdEncoded)![1],
    );
    const perm = (await this.acl.getNodePerm(nodeId1))!;
    await this.acl.setNodesPerm(nodeIds, perm, tran);
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unlinkNodeAndIdentity(
    nodeId: NodeId,
    providerIdentityId: ProviderIdentityId,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.unlinkNodeAndIdentity(nodeId, providerIdentityId, tran),
      );
    }
    // Unlinking needs to do the following:
    // 1. check if both nodes exist as verticies
    // 2. check if the link exists between them
    // 3. remove the link between them
    // 5. Check if any of the vertices became a singleton
    // 4. check if the gestalt splits into two separate gestalts and copy the
    //  permissions between them.
    const nodeKey = gestaltsUtils.toGestaltNodeKey(['node', nodeId]);
    const identityKey = gestaltsUtils.toGestaltIdentityKey([
      'identity',
      providerIdentityId,
    ]);
    // Checking if the vertices exist
    if ((await tran.get([...this.dbNodesPath, nodeKey], true)) == null) return;
    if (
      (await tran.get([...this.dbIdentitiesPath, identityKey], true)) == null
    ) {
      return;
    }
    // Checking if the link exists
    const linkId = await tran.get(
      [...this.dbMatrixPath, nodeKey, identityKey],
      true,
    );
    if (linkId == null) return;
    // Remove the link
    await tran.del([...this.dbLinksPath, linkId]);
    await tran.del([...this.dbMatrixPath, nodeKey, identityKey]);
    await tran.del([...this.dbMatrixPath, identityKey, nodeKey]);
    // Check if the gestalt was split in two
    const gestalt = (await this.getGestaltByKey(nodeKey, undefined, tran))!;
    const identityKeyId = gestaltsUtils.encodeGestaltIdentityId([
      'identity',
      providerIdentityId,
    ]);
    // If the nodes are part of the same gestalt then do nothing to the permissions
    if (gestalt.identities[identityKeyId] != null) return;
    // Check if the vertices should be singletons now.
    // we check this by iterating over the links in the matrix.
    let nodeNeighbors = false;
    for await (const _ of tran.iterator([...this.dbMatrixPath, nodeKey], {
      limit: 1,
    })) {
      nodeNeighbors = true;
    }
    // Set as a singleton
    if (!nodeNeighbors) await tran.put([...this.dbMatrixPath, nodeKey], null);
    const identityLinkedNode = await this.getIdentityLinkedNodeId(
      providerIdentityId,
      tran,
    );
    // If the identity is a singleton now
    // Then there is no need to update permissions
    if (identityLinkedNode == null) {
      await tran.put([...this.dbMatrixPath, identityKey], null);
      return;
    }
    // Need to copy the ACL permissions between the two gestalts
    const nodeIds = Object.keys(gestalt.nodes).map(
      (nodeIdEncoded) => gestaltsUtils.decodeGestaltNodeId(nodeIdEncoded)![1],
    );
    const perm = (await this.acl.getNodePerm(identityLinkedNode))!;
    await this.acl.setNodesPerm(nodeIds, perm, tran);
  }

  // Overloaded version of unlinkNodeAndNode and unlinkNodeAndIdentity
  public unlinkVertexAndVertex(
    gestaltId1: ['node', NodeId],
    gestaltId2: ['node', NodeId],
    tran?: DBTransaction,
  ): Promise<void>;
  public unlinkVertexAndVertex(
    gestaltId1: ['node', NodeId],
    gestaltId2: ['identity', ProviderIdentityId],
    tran?: DBTransaction,
  ): Promise<void>;
  public unlinkVertexAndVertex(
    gestaltId1: ['identity', ProviderIdentityId],
    gestaltId2: ['node', NodeId],
    tran?: DBTransaction,
  ): Promise<void>;
  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public unlinkVertexAndVertex(
    gestaltId1: GestaltId,
    gestaltId2: GestaltId,
    tran?: DBTransaction,
  ): Promise<void> {
    const [type1, info1] = gestaltId1;
    const [type2, info2] = gestaltId2;
    if (type1 === 'node' && type2 === 'node') {
      return this.unlinkNodeAndNode(info1 as NodeId, info2 as NodeId, tran);
    } else if (type1 === 'node' && type2 === 'identity') {
      return this.unlinkNodeAndIdentity(
        info1 as NodeId,
        info2 as ProviderIdentityId,
        tran,
      );
    } else if (type1 === 'identity' && type2 === 'node') {
      return this.unlinkNodeAndIdentity(
        info2 as NodeId,
        info1 as ProviderIdentityId,
        tran,
      );
    } else {
      never();
    }
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async getGestaltActions(
    gestaltId: GestaltId,
    tran?: DBTransaction,
  ): Promise<GestaltActions> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getGestaltActions(gestaltId, tran),
      );
    }
    const [type, id] = gestaltId;
    const gestaltKey = gestaltsUtils.toGestaltKey(gestaltId);

    switch (type) {
      case 'node': {
        if ((await tran.get([...this.dbNodesPath, gestaltKey], true)) == null) {
          return {};
        }
        const perm = await this.acl.getNodePerm(id, tran);
        if (perm == null) return {};
        return perm.gestalt;
      }
      case 'identity': {
        if (
          (await tran.get([...this.dbIdentitiesPath, gestaltKey], true)) == null
        ) {
          return {};
        }
        const linkedNodeId = await this.getIdentityLinkedNodeId(id, tran);
        if (linkedNodeId == null) return {};
        const perm = await this.acl.getNodePerm(linkedNodeId, tran);
        if (perm == null) return {};
        return perm.gestalt;
      }
      default:
        never();
    }
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async setGestaltAction(
    gestaltId: GestaltId,
    action: GestaltAction,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.setGestaltAction(gestaltId, action, tran),
      );
    }
    const [type, id] = gestaltId;
    const gestaltKey = gestaltsUtils.toGestaltKey(gestaltId);

    switch (type) {
      case 'node': {
        if ((await tran.get([...this.dbNodesPath, gestaltKey], true)) == null) {
          throw new gestaltsErrors.ErrorGestaltsGraphNodeIdMissing();
        }
        await this.acl.setNodeAction(id, action, tran);
        return;
      }
      case 'identity': {
        if (
          (await tran.get([...this.dbIdentitiesPath, gestaltKey], true)) == null
        ) {
          throw new gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing();
        }
        const linkedNodeId = await this.getIdentityLinkedNodeId(id, tran);
        if (linkedNodeId == null) {
          throw new gestaltsErrors.ErrorGestaltsGraphNodeIdMissing();
        }
        await this.acl.setNodeAction(linkedNodeId, action, tran);
        return;
      }
      default:
        never();
    }
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async unsetGestaltAction(
    gestaltId: GestaltId,
    action: GestaltAction,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.unsetGestaltAction(gestaltId, action, tran),
      );
    }
    const [type, id] = gestaltId;
    const gestaltKey = gestaltsUtils.toGestaltKey(gestaltId);

    switch (type) {
      case 'node': {
        if ((await tran.get([...this.dbNodesPath, gestaltKey], true)) == null) {
          throw new gestaltsErrors.ErrorGestaltsGraphNodeIdMissing();
        }
        await this.acl.unsetNodeAction(id, action, tran);
        return;
      }
      case 'identity': {
        if (
          (await tran.get([...this.dbIdentitiesPath, gestaltKey], true)) == null
        ) {
          throw new gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing();
        }
        const linkedNodeId = await this.getIdentityLinkedNodeId(id, tran);
        if (linkedNodeId == null) {
          throw new gestaltsErrors.ErrorGestaltsGraphNodeIdMissing();
        }
        await this.acl.unsetNodeAction(linkedNodeId, action, tran);
        return;
      }
      default:
        never();
    }
  }

  // GETTERS

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async *getGestalts(tran?: DBTransaction): AsyncGenerator<Gestalt> {
    if (tran == null) {
      return yield* this.db.withTransactionG((tran) => this.getGestalts(tran));
    }
    const visited: Set<string> = new Set();
    let lastGestaltKey: GestaltKey | null = null;
    for await (const [[gestaltKey]] of tran.iterator(this.dbMatrixPath, {
      values: false,
    }) as DBIterator<[GestaltKey], undefined>) {
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
      const gestalt = (await this.getGestaltByKey(gestaltKey, visited, tran))!;
      yield gestalt;
    }
  }

  public async getGestalt(
    gestaltId: GestaltId,
    tran?: DBTransaction,
  ): Promise<Gestalt | undefined> {
    const [type, id] = gestaltId;
    switch (type) {
      case 'node':
        return await this.getGestaltByNode(id, tran);
      case 'identity':
        return await this.getGestaltByIdentity(id, tran);
      default:
        never();
    }
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
    const identityKey = gestaltsUtils.toGestaltKey([
      'identity',
      providerIdentityId,
    ]);
    return this.getGestaltByKey(identityKey, undefined, tran);
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async getNode(
    nodeId: NodeId,
    tran?: DBTransaction,
  ): Promise<GestaltNodeInfo | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.getNode(nodeId, tran));
    }
    const gestaltNodeKey = gestaltsUtils.toGestaltNodeKey(['node', nodeId]);
    const gestaltNodeInfoJSON = await tran.get<GestaltNodeInfoJSON>([
      ...this.dbNodesPath,
      gestaltNodeKey,
    ]);
    if (gestaltNodeInfoJSON == null) return;
    return gestaltsUtils.fromGestaltNodeInfoJSON(gestaltNodeInfoJSON);
  }

  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async getIdentity(
    providerIdentityId: ProviderIdentityId,
    tran?: DBTransaction,
  ): Promise<GestaltIdentityInfo | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getIdentity(providerIdentityId, tran),
      );
    }
    const gestaltIdentityKey = gestaltsUtils.toGestaltIdentityKey([
      'identity',
      providerIdentityId,
    ]);
    return await tran.get<GestaltIdentityInfo>([
      ...this.dbIdentitiesPath,
      gestaltIdentityKey,
    ]);
  }

  // Overloaded getVertex

  public async getVertex(
    gestaltId: ['node', NodeId],
    tran?: DBTransaction,
  ): Promise<['node', GestaltNodeInfo] | undefined>;
  public async getVertex(
    gestaltId: ['identity', ProviderIdentityId],
    tran?: DBTransaction,
  ): Promise<['identity', GestaltIdentityInfo] | undefined>;
  public async getVertex(
    gestaltId: GestaltId,
    tran?: DBTransaction,
  ): Promise<GestaltInfo | undefined>;
  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async getVertex(
    gestaltId: GestaltId,
    tran?: DBTransaction,
  ): Promise<GestaltInfo | undefined> {
    const [type, id] = gestaltId;
    switch (type) {
      case 'node': {
        const gestaltNodeInfo = await this.getNode(id, tran);
        if (gestaltNodeInfo == null) return;
        return ['node', gestaltNodeInfo];
      }
      case 'identity': {
        const gestaltIdentityInfo = await this.getIdentity(id, tran);
        if (gestaltIdentityInfo == null) return;
        return ['identity', gestaltIdentityInfo];
      }
      default:
        never();
    }
  }

  public async getLinkById(
    linkId: GestaltLinkId,
    tran?: DBTransaction,
  ): Promise<GestaltLink | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.getLinkById(linkId, tran));
    }
    const gestaltLinkJSON = await tran.get<GestaltLinkJSON>([
      ...this.dbLinksPath,
      linkId.toBuffer(),
    ]);
    if (gestaltLinkJSON == null) return;
    return gestaltsUtils.fromGestaltLinkJSON(gestaltLinkJSON);
  }

  public async getLink(
    gestaltId1: ['node', NodeId],
    gestaltId2: ['node', NodeId],
    tran?: DBTransaction,
  ): Promise<['node', GestaltLinkNode] | undefined>;
  public async getLink(
    gestaltId1: ['identity', ProviderIdentityId],
    gestaltId2: ['node', NodeId],
    tran?: DBTransaction,
  ): Promise<['identity', GestaltLinkIdentity] | undefined>;
  public async getLink(
    gestaltId1: ['node', NodeId],
    gestaltId2: ['identity', ProviderIdentityId],
    tran?: DBTransaction,
  ): Promise<['identity', GestaltLinkIdentity] | undefined>;
  @ready(new gestaltsErrors.ErrorGestaltsGraphNotRunning())
  public async getLink(
    gestaltId1: GestaltId,
    gestaltId2: GestaltId,
    tran?: DBTransaction,
  ): Promise<GestaltLink | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getLink(gestaltId1 as any, gestaltId2 as any, tran),
      );
    }
    const gestaltKey1 = gestaltsUtils.toGestaltKey(gestaltId1);
    const gestaltKey2 = gestaltsUtils.toGestaltKey(gestaltId2);
    const linkIdBuffer = await tran.get(
      [...this.dbMatrixPath, gestaltKey1, gestaltKey2],
      true,
    );
    if (linkIdBuffer == null) return;
    const gestaltLinkJSON = (await tran.get<GestaltLinkJSON>([
      ...this.dbLinksPath,
      linkIdBuffer,
    ]))!;
    return gestaltsUtils.fromGestaltLinkJSON(gestaltLinkJSON);
  }

  public async *getLinks(
    gestaltId: GestaltId,
    tran?: DBTransaction,
  ): AsyncGenerator<[GestaltId, GestaltLink]> {
    if (tran == null) {
      return yield* this.db.withTransactionG((tran) =>
        this.getLinks(gestaltId, tran),
      );
    }
    const gestaltKey = gestaltsUtils.toGestaltKey(gestaltId);
    for await (const [keyPath, gestaltLinkId] of tran.iterator(
      [...this.dbMatrixPath, gestaltKey],
      { valueAsBuffer: true },
    )) {
      if (gestaltLinkId == null) continue;
      const gestaltLinkJson = await tran.get<GestaltLinkJSON>([
        ...this.dbLinksPath,
        gestaltLinkId,
      ]);
      if (gestaltLinkJson == null) continue;
      const gestaltLink = gestaltsUtils.fromGestaltLinkJSON(gestaltLinkJson);
      const linkedGestaltKey = keyPath[keyPath.length - 1] as GestaltKey;
      const linkedGestaltId = gestaltsUtils.fromGestaltKey(linkedGestaltKey);
      yield [linkedGestaltId, gestaltLink];
    }
  }

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
    tran: DBTransaction,
  ): Promise<Gestalt | undefined> {
    const nodeInfoJSON = await tran.get<GestaltNodeInfoJSON>([
      ...this.dbNodesPath,
      gestaltKey,
    ]);
    const identityInfo = await tran.get<GestaltIdentityInfo>([
      ...this.dbIdentitiesPath,
      gestaltKey,
    ]);
    if (nodeInfoJSON == null && identityInfo == null) {
      return;
    }
    const gestalt = {
      matrix: {},
      nodes: {},
      identities: {},
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
        const gestaltNodeInfoJSON = await tran.get<GestaltNodeInfoJSON>([
          ...this.dbNodesPath,
          gestaltKey,
        ]);
        // Skipping if it doesn't exist
        if (gestaltNodeInfoJSON == null) continue;
        gestalt.nodes[gestaltIdEncoded] =
          gestaltsUtils.fromGestaltNodeInfoJSON(gestaltNodeInfoJSON);
      } else if (gestaltId[0] === 'identity') {
        const gestaltIdentityInfo = await tran.get<GestaltIdentityInfo>([
          ...this.dbIdentitiesPath,
          gestaltKey,
        ]);
        // Skipping if it doesn't exist
        if (gestaltIdentityInfo == null) continue;
        gestalt.identities[gestaltIdEncoded] = gestaltIdentityInfo;
      }
      // Singleton gestalts will just have an empty record
      gestalt.matrix[gestaltIdEncoded] ??= {};
      for await (const [
        [gestaltKeyNeighbour],
        gestaltLinkIdBuffer,
      ] of tran.iterator([...this.dbMatrixPath, gestaltKey]) as DBIterator<
        Array<GestaltKey>,
        Buffer
      >) {
        const gestaltIdNeighbour =
          gestaltsUtils.fromGestaltKey(gestaltKeyNeighbour);
        const gestaltIdEncodedNeighbour =
          gestaltsUtils.encodeGestaltId(gestaltIdNeighbour);
        // Skip processing neighbours that have already been processed
        if (
          gestalt.matrix[gestaltIdEncoded][gestaltIdEncodedNeighbour] != null
        ) {
          continue;
        }
        gestalt.matrix[gestaltIdEncodedNeighbour] ??= {};
        const gestaltLink = (await tran.get<GestaltLink>([
          ...this.dbLinksPath,
          gestaltLinkIdBuffer,
        ]))!;
        gestalt.matrix[gestaltIdEncoded][gestaltIdEncodedNeighbour] =
          gestaltLink;
        gestalt.matrix[gestaltIdEncodedNeighbour][gestaltIdEncoded] =
          gestaltLink;
        // Only queue the vertexes that aren't already queued
        if (!visited.has(gestaltKeyNeighbour.toString('binary'))) {
          queue.push(gestaltKeyNeighbour);
          visited.add(gestaltKeyNeighbour.toString('binary'));
        }
      }
    }
    return gestalt;
  }

  protected async getIdentityLinkedNodeId(
    providerIdentityId: ProviderIdentityId,
    tran: DBTransaction,
  ): Promise<NodeId | undefined> {
    let nodeId: NodeId | undefined;
    for await (const [gestaltId] of this.getLinks(
      ['identity', providerIdentityId],
      tran,
    )) {
      // Return the first NodeId
      if (gestaltId[0] === 'node') nodeId = gestaltId[1];
    }
    return nodeId;
  }
}

export default GestaltGraph;
