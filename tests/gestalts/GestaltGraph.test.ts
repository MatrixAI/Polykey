import type { NodeId, NodeInfo } from '@/nodes/types';
import type {
  IdentityClaimId,
  IdentityId,
  IdentityInfo,
  IdentityClaims,
  ProviderId,
  IdentityClaim,
} from '@/identities/types';
import type { Claim, SignatureData } from '@/claims/types';
import type { ChainData } from '@/sigchain/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { GestaltGraph, utils as gestaltsUtils } from '@/gestalts';
import { ACL } from '@/acl';
import { KeyManager } from '@/keys';
import { DB } from '@matrixai/db';
import { makeCrypto } from '../utils';

describe('GestaltGraph', () => {
  const pass = 'password';
  const logger = new Logger('GestaltGraph Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let keyManager: KeyManager;
  let db: DB;
  let acl: ACL;

  // Abc <--> dee claims:
  const abcDeeSignatures: Record<NodeId, SignatureData> = {};
  let nodeClaimAbcToDee: Claim;
  let nodeClaimDeeToAbc: Claim;
  // Abc <--> GitHub claims:
  const abcSignature: Record<NodeId, SignatureData> = {};
  let identityClaimAbcToGH: Claim;
  let identityClaimGHToAbc: IdentityClaim;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyManager = await KeyManager.createKeyManager({
      password: pass,
      keysPath,
      logger,
    });
    const dbPath = `${dataDir}/db`;
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: makeCrypto(keyManager),
    });
    await db.start();

    acl = await ACL.createACL({ db, logger });

    // Initialise some dummy claims:
    abcDeeSignatures['abc'] = 'abcSignature';
    abcDeeSignatures['dee'] = 'deeSignature';
    // Node claim on node abc: abc -> dee
    nodeClaimAbcToDee = {
      payload: {
        hPrev: null,
        seq: 1,
        data: {
          type: 'node',
          node1: 'abc' as NodeId,
          node2: 'dee' as NodeId,
        },
        iat: 1618203162,
      },
      signatures: abcDeeSignatures,
    };
    // Node claim on node dee: dee -> abc
    nodeClaimDeeToAbc = {
      payload: {
        hPrev: null,
        seq: 1,
        data: {
          type: 'node',
          node1: 'dee' as NodeId, //TODO: use type guards for all `as NodeID` usages here.
          node2: 'abc' as NodeId,
        },
        iat: 1618203162,
      },
      signatures: abcDeeSignatures,
    };

    abcSignature['abc'] = 'abcSignature';
    // Identity claim on node abc: abc -> GitHub
    identityClaimAbcToGH = {
      payload: {
        hPrev: null,
        seq: 1,
        data: {
          type: 'identity',
          node: 'abc' as NodeId,
          provider: 'github.com' as ProviderId,
          identity: 'abc' as IdentityId,
        },
        iat: 1618203162,
      },
      signatures: abcSignature,
    };
    // Identity claim on Github identity: GitHub -> abc
    identityClaimGHToAbc = {
      id: 'abcGistId' as IdentityClaimId,
      payload: {
        hPrev: null,
        seq: 1,
        data: {
          type: 'identity',
          node: 'abc' as NodeId,
          provider: 'github.com' as ProviderId,
          identity: 'abc' as IdentityId,
        },
        iat: 1618203162,
      },
      signatures: abcSignature,
    };
  });
  afterEach(async () => {
    await acl.destroy();
    await db.stop();
    await db.destroy();
    await keyManager.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('get, set and unset node', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const nodeInfo: NodeInfo = {
      id: 'abc' as NodeId,
      chain: {},
    };
    await gestaltGraph.setNode(nodeInfo);
    const gestalt = await gestaltGraph.getGestaltByNode(nodeInfo.id);
    const gk = gestaltsUtils.keyFromNode(nodeInfo.id);
    expect(gestalt).toStrictEqual({
      matrix: { [gk]: {} },
      nodes: { [gk]: nodeInfo },
      identities: {},
    });
    await gestaltGraph.unsetNode(nodeInfo.id);
    await gestaltGraph.unsetNode(nodeInfo.id);
    await expect(
      gestaltGraph.getGestaltByNode(nodeInfo.id),
    ).resolves.toBeUndefined();
    await gestaltGraph.destroy();
  });
  test('get, set and unset identity', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      claims: {},
    };
    await gestaltGraph.setIdentity(identityInfo);
    const gestalt = await gestaltGraph.getGestaltByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    const gk = gestaltsUtils.keyFromIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(gestalt).toStrictEqual({
      matrix: { [gk]: {} },
      nodes: {},
      identities: { [gk]: identityInfo },
    });
    await gestaltGraph.unsetIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    await gestaltGraph.unsetIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    await expect(
      gestaltGraph.getGestaltByIdentity(
        identityInfo.providerId,
        identityInfo.identityId,
      ),
    ).resolves.toBeUndefined();
    await gestaltGraph.destroy();
  });
  test('setting independent node and identity gestalts', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const nodeInfo: NodeInfo = {
      id: 'abc' as NodeId,
      chain: {},
    };
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      claims: {},
    };
    await gestaltGraph.setNode(nodeInfo);
    await gestaltGraph.setIdentity(identityInfo);
    const gestaltNode = await gestaltGraph.getGestaltByNode(nodeInfo.id);
    const gestaltIdentity = await gestaltGraph.getGestaltByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    const gkNode = gestaltsUtils.keyFromNode(nodeInfo.id);
    const gkIdentity = gestaltsUtils.keyFromIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(gestaltNode).toStrictEqual({
      matrix: { [gkNode]: {} },
      nodes: { [gkNode]: nodeInfo },
      identities: {},
    });
    expect(gestaltIdentity).toStrictEqual({
      matrix: { [gkIdentity]: {} },
      nodes: {},
      identities: { [gkIdentity]: identityInfo },
    });
    await gestaltGraph.destroy();
  });
  test('start and stop preserves state', async () => {
    let gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const nodeInfo: NodeInfo = {
      id: 'abc' as NodeId,
      chain: {},
    };
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      claims: {},
    };
    await gestaltGraph.setNode(nodeInfo);
    await gestaltGraph.setIdentity(identityInfo);
    await gestaltGraph.destroy();

    gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const gestaltNode = await gestaltGraph.getGestaltByNode(nodeInfo.id);
    const gestaltIdentity = await gestaltGraph.getGestaltByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    const gkNode = gestaltsUtils.keyFromNode(nodeInfo.id);
    const gkIdentity = gestaltsUtils.keyFromIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(gestaltNode).toStrictEqual({
      matrix: { [gkNode]: {} },
      nodes: { [gkNode]: nodeInfo },
      identities: {},
    });
    expect(gestaltIdentity).toStrictEqual({
      matrix: { [gkIdentity]: {} },
      nodes: {},
      identities: { [gkIdentity]: identityInfo },
    });
    await gestaltGraph.destroy();
  });
  test('link node to node', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    // NodeInfo on node 'abc'. Contains claims:
    // abc -> dee
    const nodeInfo1Chain: ChainData = {};
    nodeInfo1Chain['A'] = nodeClaimAbcToDee;
    const nodeInfo1: NodeInfo = {
      id: 'abc' as NodeId,
      chain: nodeInfo1Chain,
    };
    // NodeInfo on node 'dee'. Contains claims:
    // dee -> abc
    const nodeInfo2Chain: ChainData = {};
    nodeInfo2Chain['A'] = nodeClaimDeeToAbc;
    const nodeInfo2: NodeInfo = {
      id: 'dee' as NodeId,
      chain: nodeInfo2Chain,
    };
    await gestaltGraph.linkNodeAndNode(nodeInfo1, nodeInfo2);
    const gestaltNode1 = await gestaltGraph.getGestaltByNode(nodeInfo1.id);
    const gestaltNode2 = await gestaltGraph.getGestaltByNode(nodeInfo2.id);
    expect(gestaltNode1).not.toBeUndefined();
    expect(gestaltNode2).not.toBeUndefined();
    expect(gestaltNode1).toStrictEqual(gestaltNode2);
    const gkNode1 = gestaltsUtils.keyFromNode(nodeInfo1.id);
    const gkNode2 = gestaltsUtils.keyFromNode(nodeInfo2.id);
    expect(gestaltNode1).toStrictEqual({
      matrix: {
        [gkNode1]: {
          [gkNode2]: null,
        },
        [gkNode2]: {
          [gkNode1]: null,
        },
      },
      nodes: {
        [gkNode1]: nodeInfo1,
        [gkNode2]: nodeInfo2,
      },
      identities: {},
    });
    await gestaltGraph.destroy();
  });
  test('link node to identity', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    // NodeInfo on node 'abc'. Contains claims:
    // abc -> GitHub
    const nodeInfo1Chain: ChainData = {};
    nodeInfo1Chain['A'] = identityClaimAbcToGH;
    const nodeInfo: NodeInfo = {
      id: 'abc' as NodeId,
      chain: nodeInfo1Chain,
    };
    // IdentityInfo on identity from GitHub. Contains claims:
    // GitHub -> abc
    const identityInfoClaims: IdentityClaims = {};
    identityInfoClaims['abcGistId'] = identityClaimGHToAbc;
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      claims: identityInfoClaims,
    };
    await gestaltGraph.linkNodeAndIdentity(nodeInfo, identityInfo);
    const gestaltNode = await gestaltGraph.getGestaltByNode(nodeInfo.id);
    const gestaltIdentity = await gestaltGraph.getGestaltByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(gestaltNode).not.toBeUndefined();
    expect(gestaltNode).toStrictEqual(gestaltIdentity);
    const gkNode = gestaltsUtils.keyFromNode(nodeInfo.id);
    const gkIdentity = gestaltsUtils.keyFromIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(gestaltNode).toStrictEqual({
      matrix: {
        [gkNode]: {
          [gkIdentity]: null,
        },
        [gkIdentity]: {
          [gkNode]: null,
        },
      },
      nodes: {
        [gkNode]: nodeInfo,
      },
      identities: {
        [gkIdentity]: identityInfo,
      },
    });
    await gestaltGraph.destroy();
  });
  test('link node to node and identity', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    // NodeInfo on node 'abc'. Contains claims:
    // abc -> dee
    // abc -> GitHub
    const nodeInfo1Chain: Record<IdentityClaimId, Claim> = {};
    nodeInfo1Chain['A'] = nodeClaimAbcToDee;
    identityClaimAbcToGH.payload.seq = 2;
    nodeInfo1Chain['B'] = identityClaimAbcToGH;
    const nodeInfo1: NodeInfo = {
      id: 'abc' as NodeId,
      chain: nodeInfo1Chain,
    };
    // NodeInfo on node 'dee'. Contains claims:
    // dee -> abc
    const nodeInfo2Chain: ChainData = {};
    nodeInfo2Chain['A'] = nodeClaimDeeToAbc;
    const nodeInfo2: NodeInfo = {
      id: 'dee' as NodeId,
      chain: nodeInfo2Chain,
    };
    // IdentityInfo on identity from GitHub. Contains claims:
    // GitHub -> abc
    const identityInfoClaims: IdentityClaims = {};
    identityInfoClaims['abcGistId'] = identityClaimGHToAbc;
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      claims: identityInfoClaims,
    };
    await gestaltGraph.linkNodeAndIdentity(nodeInfo1, identityInfo);
    await gestaltGraph.linkNodeAndNode(nodeInfo1, nodeInfo2);
    const gestaltNode1 = await gestaltGraph.getGestaltByNode(nodeInfo1.id);
    const gestaltNode2 = await gestaltGraph.getGestaltByNode(nodeInfo2.id);
    const gestaltIdentity = await gestaltGraph.getGestaltByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(gestaltNode1).not.toBeUndefined();
    expect(gestaltNode2).not.toBeUndefined();
    expect(gestaltIdentity).not.toBeUndefined();
    expect(gestaltNode1).toStrictEqual(gestaltNode2);
    expect(gestaltNode2).toStrictEqual(gestaltIdentity);
    const gkNode1 = gestaltsUtils.keyFromNode(nodeInfo1.id);
    const gkNode2 = gestaltsUtils.keyFromNode(nodeInfo2.id);
    const gkIdentity = gestaltsUtils.keyFromIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(gestaltIdentity).toStrictEqual({
      matrix: {
        [gkNode1]: {
          [gkNode2]: null,
          [gkIdentity]: null,
        },
        [gkNode2]: {
          [gkNode1]: null,
        },
        [gkIdentity]: {
          [gkNode1]: null,
        },
      },
      nodes: {
        [gkNode1]: nodeInfo1,
        [gkNode2]: nodeInfo2,
      },
      identities: {
        [gkIdentity]: identityInfo,
      },
    });
    await gestaltGraph.destroy();
  });
  test('getting all gestalts', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const nodeInfo: NodeInfo = {
      id: 'abc' as NodeId,
      chain: {},
    };
    await gestaltGraph.setNode(nodeInfo);
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      claims: {},
    };
    await gestaltGraph.setIdentity(identityInfo);
    const gestalts = await gestaltGraph.getGestalts();
    const identityGestalt = await gestaltGraph.getGestaltByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    const nodeGestalt = await gestaltGraph.getGestaltByNode(nodeInfo.id);
    expect(gestalts).toContainEqual(identityGestalt);
    expect(gestalts).toContainEqual(nodeGestalt);
    expect(gestalts).toHaveLength(2);

    // Check if the two combine after linking.
    await gestaltGraph.linkNodeAndIdentity(nodeInfo, identityInfo);
    const gestalts2 = await gestaltGraph.getGestalts();
    expect(gestalts2).toHaveLength(1);
    const gestalts2String = JSON.stringify(gestalts2[0]);
    expect(gestalts2String).toContain(nodeInfo.id);
    expect(gestalts2String).toContain(identityInfo.providerId);
    expect(gestalts2String).toContain(identityInfo.identityId);

    await gestaltGraph.destroy();
  });
  test('new node gestalts creates a new acl record', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const nodeInfo: NodeInfo = {
      id: 'abc' as NodeId,
      chain: {},
    };
    expect(await acl.getNodePerm(nodeInfo.id)).toBeUndefined();
    await gestaltGraph.setNode(nodeInfo);
    const perm = await acl.getNodePerm(nodeInfo.id);
    expect(perm).toBeDefined();
    expect(perm).toMatchObject({
      gestalt: {},
      vaults: {},
    });
    const actions = await gestaltGraph.getGestaltActionsByNode(nodeInfo.id);
    expect(actions).toBeDefined();
    expect(actions).toMatchObject({});
    await gestaltGraph.destroy();
  });
  test('new identity gestalts does not create a new acl record', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      claims: {},
    };
    await gestaltGraph.setIdentity(identityInfo);
    const actions = await gestaltGraph.getGestaltActionsByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(actions).toBeUndefined();
    await gestaltGraph.destroy();
  });
  test('set and unset gestalt actions', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const nodeInfo: NodeInfo = {
      id: 'abc' as NodeId,
      chain: {},
    };
    await gestaltGraph.setNode(nodeInfo);
    await gestaltGraph.setGestaltActionByNode(nodeInfo.id, 'notify');
    let actions;
    actions = await gestaltGraph.getGestaltActionsByNode(nodeInfo.id);
    expect(actions).toHaveProperty('notify');
    const perm = await acl.getNodePerm(nodeInfo.id);
    expect(perm).toBeDefined();
    expect(perm).toMatchObject({
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await gestaltGraph.unsetGestaltActionByNode(nodeInfo.id, 'notify');
    actions = await gestaltGraph.getGestaltActionsByNode(nodeInfo.id);
    expect(actions).not.toHaveProperty('notify');
    await gestaltGraph.destroy();
  });
  test('linking 2 new nodes results in a merged permission', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    // 2 new nodes should have the same permission
    // NodeInfo on node 'abc'. Contains claims:
    // abc -> dee
    const nodeInfo1Chain: ChainData = {};
    nodeInfo1Chain['A'] = nodeClaimAbcToDee;
    const nodeInfo1: NodeInfo = {
      id: 'abc' as NodeId,
      chain: nodeInfo1Chain,
    };
    // NodeInfo on node 'dee'. Contains claims:
    // dee -> abc
    const nodeInfo2Chain: ChainData = {};
    nodeInfo2Chain['A'] = nodeClaimDeeToAbc;
    const nodeInfo2: NodeInfo = {
      id: 'dee' as NodeId,
      chain: nodeInfo2Chain,
    };
    await gestaltGraph.linkNodeAndNode(nodeInfo1, nodeInfo2);
    let actions1, actions2;
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeInfo1.id);
    actions2 = await gestaltGraph.getGestaltActionsByNode(nodeInfo2.id);
    expect(actions1).not.toBeUndefined();
    expect(actions2).not.toBeUndefined();
    expect(actions1).toEqual(actions2);
    await gestaltGraph.setGestaltActionByNode(nodeInfo1.id, 'notify');
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeInfo1.id);
    actions2 = await gestaltGraph.getGestaltActionsByNode(nodeInfo2.id);
    expect(actions1).toEqual({ notify: null });
    expect(actions1).toEqual(actions2);
    await gestaltGraph.destroy();
  });
  test('linking 2 existing nodes results in a merged permission', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    // 2 existing nodes will have a joined permission
    const nodeInfo1: NodeInfo = {
      id: 'abc' as NodeId,
      chain: {},
    };
    const nodeInfo2: NodeInfo = {
      id: 'dee' as NodeId,
      chain: {},
    };
    await gestaltGraph.setNode(nodeInfo1);
    await gestaltGraph.setNode(nodeInfo2);
    await gestaltGraph.setGestaltActionByNode(nodeInfo1.id, 'notify');
    await gestaltGraph.setGestaltActionByNode(nodeInfo2.id, 'scan');
    // NodeInfo on node 'abc'. Contains claims:
    // abc -> dee
    const nodeInfo1Chain: ChainData = {};
    nodeInfo1Chain['A'] = nodeClaimAbcToDee;
    const nodeInfo1Linked: NodeInfo = {
      id: 'abc' as NodeId,
      chain: nodeInfo1Chain,
    };
    // NodeInfo on node 'dee'. Contains claims:
    // dee -> abc
    const nodeInfo2Chain: ChainData = {};
    nodeInfo2Chain['A'] = nodeClaimDeeToAbc;
    const nodeInfo2Linked: NodeInfo = {
      id: 'dee' as NodeId,
      chain: nodeInfo2Chain,
    };
    await gestaltGraph.linkNodeAndNode(nodeInfo1Linked, nodeInfo2Linked);
    const actions1 = await gestaltGraph.getGestaltActionsByNode(
      nodeInfo1Linked.id,
    );
    const actions2 = await gestaltGraph.getGestaltActionsByNode(
      nodeInfo2Linked.id,
    );
    expect(actions1).not.toBeUndefined();
    expect(actions2).not.toBeUndefined();
    expect(actions1).toEqual({ notify: null, scan: null });
    expect(actions1).toEqual(actions2);
    await gestaltGraph.destroy();
  });
  test('link existing node to new node', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    // Node 1 exists, but node 2 is new
    const nodeInfo1: NodeInfo = {
      id: 'abc' as NodeId,
      chain: {},
    };
    await gestaltGraph.setNode(nodeInfo1);
    await gestaltGraph.setGestaltActionByNode(nodeInfo1.id, 'notify');
    // NodeInfo on node 'abc'. Contains claims:
    // abc -> dee
    const nodeInfo1Chain: ChainData = {};
    nodeInfo1Chain['A'] = nodeClaimAbcToDee;
    const nodeInfo1Linked: NodeInfo = {
      id: 'abc' as NodeId,
      chain: nodeInfo1Chain,
    };
    // NodeInfo on node 'dee'. Contains claims:
    // dee -> abc
    const nodeInfo2Chain: ChainData = {};
    nodeInfo2Chain['A'] = nodeClaimDeeToAbc;
    const nodeInfo2Linked: NodeInfo = {
      id: 'dee' as NodeId,
      chain: nodeInfo2Chain,
    };
    await gestaltGraph.linkNodeAndNode(nodeInfo1Linked, nodeInfo2Linked);
    let actions1, actions2;
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeInfo1Linked.id);
    actions2 = await gestaltGraph.getGestaltActionsByNode(nodeInfo2Linked.id);
    expect(actions1).not.toBeUndefined();
    expect(actions2).not.toBeUndefined();
    expect(actions1).toEqual({ notify: null });
    expect(actions1).toEqual(actions2);
    // Node 3 is new and linking to node 2 which is now exists
    const zzzDeeSignatures: Record<NodeId, SignatureData> = {};
    zzzDeeSignatures['zzz'] = 'zzzSignature';
    zzzDeeSignatures['dee'] = 'deeSignature';
    // Node claim on node abc: abc -> dee
    const nodeClaimZzzToDee: Claim = {
      payload: {
        hPrev: null,
        seq: 1,
        data: {
          type: 'node',
          node1: 'zzz' as NodeId,
          node2: 'dee' as NodeId,
        },
        iat: 1618203162,
      },
      signatures: zzzDeeSignatures,
    };
    // NodeInfo on node 'abc'. Contains claims:
    // abc -> dee
    const nodeInfo3Chain: ChainData = {};
    nodeInfo3Chain['A'] = nodeClaimZzzToDee;
    const nodeInfo3Linked: NodeInfo = {
      id: 'zzz' as NodeId,
      chain: nodeInfo3Chain,
    };
    await gestaltGraph.linkNodeAndNode(nodeInfo3Linked, nodeInfo2Linked);
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeInfo1Linked.id);
    actions2 = await gestaltGraph.getGestaltActionsByNode(nodeInfo2Linked.id);
    const actions3 = await gestaltGraph.getGestaltActionsByNode(
      nodeInfo3Linked.id,
    );
    expect(actions1).not.toBeUndefined();
    expect(actions2).not.toBeUndefined();
    expect(actions3).not.toBeUndefined();
    expect(actions3).toEqual({ notify: null });
    expect(actions3).toEqual(actions2);
    await gestaltGraph.destroy();
  });
  test('linking new node and new identity results in a merged permission', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    // NodeInfo on node 'abc'. Contains claims:
    // abc -> GitHub
    const nodeInfo1Chain: ChainData = {};
    nodeInfo1Chain['A'] = identityClaimAbcToGH;
    const nodeInfo: NodeInfo = {
      id: 'abc' as NodeId,
      chain: nodeInfo1Chain,
    };
    // IdentityInfo on identity from GitHub. Contains claims:
    // GitHub -> abc
    const identityInfoClaims: IdentityClaims = {};
    identityInfoClaims['abcGistId'] = identityClaimGHToAbc;
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      claims: identityInfoClaims,
    };
    await gestaltGraph.linkNodeAndIdentity(nodeInfo, identityInfo);
    let actions1, actions2;
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeInfo.id);
    actions2 = await gestaltGraph.getGestaltActionsByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(actions1).not.toBeUndefined();
    expect(actions2).not.toBeUndefined();
    expect(actions1).toEqual({});
    expect(actions1).toEqual(actions2);
    await gestaltGraph.setGestaltActionByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
      'notify',
    );
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeInfo.id);
    actions2 = await gestaltGraph.getGestaltActionsByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(actions1).toEqual({ notify: null });
    expect(actions1).toEqual(actions2);
    await gestaltGraph.destroy();
  });
  test('linking existing node and existing identity results in merged permission', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const nodeInfo: NodeInfo = {
      id: 'abc' as NodeId,
      chain: {},
    };
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      claims: {},
    };
    await gestaltGraph.setNode(nodeInfo);
    await gestaltGraph.setIdentity(identityInfo);
    await gestaltGraph.setGestaltActionByNode(nodeInfo.id, 'notify');
    // NodeInfo on node 'abc'. Contains claims:
    // abc -> GitHub
    const nodeInfo1Chain: ChainData = {};
    nodeInfo1Chain['A'] = identityClaimAbcToGH;
    const nodeInfoLinked: NodeInfo = {
      id: 'abc' as NodeId,
      chain: nodeInfo1Chain,
    };
    // IdentityInfo on identity from GitHub. Contains claims:
    // GitHub -> abc
    const identityInfoClaims: IdentityClaims = {};
    identityInfoClaims['abcGistId'] = identityClaimGHToAbc;
    const identityInfoLinked: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      claims: identityInfoClaims,
    };
    await gestaltGraph.linkNodeAndIdentity(nodeInfoLinked, identityInfoLinked);
    let actions1, actions2;
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeInfo.id);
    actions2 = await gestaltGraph.getGestaltActionsByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(actions1).not.toBeUndefined();
    expect(actions2).not.toBeUndefined();
    expect(actions1).toEqual({ notify: null });
    expect(actions1).toEqual(actions2);
    const nodeInfo2: NodeInfo = {
      id: 'def' as NodeId,
      chain: {},
    };
    await gestaltGraph.setNode(nodeInfo2);
    await gestaltGraph.unsetGestaltActionByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
      'notify',
    );
    await gestaltGraph.setGestaltActionByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
      'scan',
    );
    await gestaltGraph.setGestaltActionByNode(nodeInfo2.id, 'notify');

    const defSignature: Record<NodeId, SignatureData> = {};
    defSignature['def'] = 'defSignature';
    // Identity claim on node abc: def -> GitHub
    const identityClaimDefToGH: Claim = {
      payload: {
        hPrev: null,
        seq: 1,
        data: {
          type: 'identity',
          node: 'def' as NodeId,
          provider: 'github.com' as ProviderId,
          identity: 'abc' as IdentityId,
        },
        iat: 1618203162,
      },
      signatures: defSignature,
    };
    // NodeInfo on node 'def'. Contains claims:
    // def -> GitHub (abc)
    const nodeInfo2Chain: ChainData = {};
    nodeInfo1Chain['A'] = identityClaimDefToGH;
    const nodeInfo2Linked: NodeInfo = {
      id: 'def' as NodeId,
      chain: nodeInfo2Chain,
    };

    // Identity claim on Github identity: GitHub -> def
    const identityClaimGHToDef = {
      id: 'abcGistId2' as IdentityClaimId,
      payload: {
        hPrev: null,
        seq: 2,
        data: {
          type: 'identity',
          node: 'def' as NodeId,
          provider: 'github.com' as ProviderId,
          identity: 'abc' as IdentityId,
        },
        iat: 1618203162,
      },
      signatures: defSignature,
    };
    // IdentityInfo on identity from GitHub. Contains claims:
    // GitHub (abc) -> abc
    // GitHub (abc) -> def
    const identityInfoClaimsAgain: IdentityClaims = {};
    identityInfoClaimsAgain['abcGistId'] = identityClaimGHToAbc;
    identityInfoClaimsAgain['abcGistId2'] = identityClaimGHToDef;
    const identityInfoLinkedAgain: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      claims: identityInfoClaims,
    };
    await gestaltGraph.linkNodeAndIdentity(
      nodeInfo2Linked,
      identityInfoLinkedAgain,
    );
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeInfo.id);
    actions2 = await gestaltGraph.getGestaltActionsByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    const actions3 = await gestaltGraph.getGestaltActionsByNode(nodeInfo2.id);
    expect(actions1).not.toBeUndefined();
    expect(actions2).not.toBeUndefined();
    expect(actions3).not.toBeUndefined();
    expect(actions2).toEqual({ notify: null, scan: null });
    expect(actions1).toEqual(actions2);
    expect(actions2).toEqual(actions3);
    await gestaltGraph.destroy();
  });
  test('link existing node to new identity', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const nodeInfo: NodeInfo = {
      id: 'abc' as NodeId,
      chain: {},
    };
    await gestaltGraph.setNode(nodeInfo);
    // NodeInfo on node 'abc'. Contains claims:
    // abc -> GitHub
    const nodeInfo1Chain: ChainData = {};
    nodeInfo1Chain['A'] = identityClaimAbcToGH;
    const nodeInfoLinked: NodeInfo = {
      id: 'abc' as NodeId,
      chain: nodeInfo1Chain,
    };
    // IdentityInfo on identity from GitHub. Contains claims:
    // GitHub -> abc
    const identityInfoClaims: IdentityClaims = {};
    identityInfoClaims['abcGistId'] = identityClaimGHToAbc;
    const identityInfoLinked: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      claims: identityInfoClaims,
    };
    await gestaltGraph.linkNodeAndIdentity(nodeInfoLinked, identityInfoLinked);
    let actions1, actions2;
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeInfo.id);
    actions2 = await gestaltGraph.getGestaltActionsByIdentity(
      identityInfoLinked.providerId,
      identityInfoLinked.identityId,
    );
    expect(actions1).not.toBeUndefined();
    expect(actions2).not.toBeUndefined();
    expect(actions1).toEqual(actions2);
    expect(actions1).toEqual({});
    await gestaltGraph.setGestaltActionByIdentity(
      identityInfoLinked.providerId,
      identityInfoLinked.identityId,
      'scan',
    );
    await gestaltGraph.setGestaltActionByIdentity(
      identityInfoLinked.providerId,
      identityInfoLinked.identityId,
      'notify',
    );
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeInfo.id);
    actions2 = await gestaltGraph.getGestaltActionsByIdentity(
      identityInfoLinked.providerId,
      identityInfoLinked.identityId,
    );
    expect(actions1).not.toBeUndefined();
    expect(actions2).not.toBeUndefined();
    expect(actions1).toEqual(actions2);
    expect(actions1).toEqual({
      scan: null,
      notify: null,
    });
    await gestaltGraph.destroy();
  });
  test('link new node to existing identity', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      claims: {},
    };
    await gestaltGraph.setIdentity(identityInfo);
    // NodeInfo on node 'abc'. Contains claims:
    // abc -> GitHub
    const nodeInfo1Chain: ChainData = {};
    nodeInfo1Chain['A'] = identityClaimAbcToGH;
    const nodeInfoLinked: NodeInfo = {
      id: 'abc' as NodeId,
      chain: nodeInfo1Chain,
    };
    // IdentityInfo on identity from GitHub. Contains claims:
    // GitHub -> abc
    const identityInfoClaims: IdentityClaims = {};
    identityInfoClaims['abcGistId'] = identityClaimGHToAbc;
    const identityInfoLinked: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      claims: identityInfoClaims,
    };
    await gestaltGraph.linkNodeAndIdentity(nodeInfoLinked, identityInfoLinked);
    let actions1, actions2;
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeInfoLinked.id);
    actions2 = await gestaltGraph.getGestaltActionsByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(actions1).not.toBeUndefined();
    expect(actions2).not.toBeUndefined();
    expect(actions1).toEqual(actions2);
    expect(actions1).toEqual({});
    await gestaltGraph.setGestaltActionByNode(nodeInfoLinked.id, 'scan');
    await gestaltGraph.setGestaltActionByNode(nodeInfoLinked.id, 'notify');
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeInfoLinked.id);
    actions2 = await gestaltGraph.getGestaltActionsByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(actions1).not.toBeUndefined();
    expect(actions2).not.toBeUndefined();
    expect(actions1).toEqual(actions2);
    expect(actions1).toEqual({
      scan: null,
      notify: null,
    });
    await gestaltGraph.destroy();
  });
  test('splitting node and node results in split inherited permissions', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    // NodeInfo on node 'abc'. Contains claims:
    // abc -> dee
    const nodeInfo1Chain: ChainData = {};
    nodeInfo1Chain['A'] = nodeClaimAbcToDee;
    const nodeInfo1: NodeInfo = {
      id: 'abc' as NodeId,
      chain: nodeInfo1Chain,
    };
    // NodeInfo on node 'dee'. Contains claims:
    // dee -> abc
    const nodeInfo2Chain: ChainData = {};
    nodeInfo2Chain['A'] = nodeClaimDeeToAbc;
    const nodeInfo2: NodeInfo = {
      id: 'dee' as NodeId,
      chain: nodeInfo2Chain,
    };
    await gestaltGraph.linkNodeAndNode(nodeInfo1, nodeInfo2);
    await gestaltGraph.setGestaltActionByNode(nodeInfo1.id, 'scan');
    await gestaltGraph.setGestaltActionByNode(nodeInfo1.id, 'notify');
    let nodePerms;
    nodePerms = await acl.getNodePerms();
    expect(Object.keys(nodePerms)).toHaveLength(1);
    await gestaltGraph.unlinkNodeAndNode(nodeInfo1.id, nodeInfo2.id);
    let actions1, actions2;
    let perm1, perm2;
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeInfo1.id);
    actions2 = await gestaltGraph.getGestaltActionsByNode(nodeInfo2.id);
    expect(actions1).toEqual({ scan: null, notify: null });
    expect(actions2).toEqual({ scan: null, notify: null });
    perm1 = await acl.getNodePerm(nodeInfo1.id);
    perm2 = await acl.getNodePerm(nodeInfo2.id);
    expect(perm1).toEqual(perm2);
    await gestaltGraph.unsetGestaltActionByNode(nodeInfo1.id, 'notify');
    await gestaltGraph.unsetGestaltActionByNode(nodeInfo2.id, 'scan');
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeInfo1.id);
    actions2 = await gestaltGraph.getGestaltActionsByNode(nodeInfo2.id);
    expect(actions1).toEqual({ scan: null });
    expect(actions2).toEqual({ notify: null });
    perm1 = await acl.getNodePerm(nodeInfo1.id);
    perm2 = await acl.getNodePerm(nodeInfo2.id);
    expect(perm1).not.toEqual(perm2);
    nodePerms = await acl.getNodePerms();
    expect(Object.keys(nodePerms)).toHaveLength(2);
    await gestaltGraph.destroy();
  });
  test('splitting node and identity results in split inherited permissions unless the identity is a loner', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    // NodeInfo on node 'abc'. Contains claims:
    // abc -> GitHub
    const nodeInfo1Chain: ChainData = {};
    nodeInfo1Chain['A'] = identityClaimAbcToGH;
    const nodeInfo: NodeInfo = {
      id: 'abc' as NodeId,
      chain: nodeInfo1Chain,
    };
    // IdentityInfo on identity from GitHub. Contains claims:
    // GitHub -> abc
    const identityInfoClaims: IdentityClaims = {};
    identityInfoClaims['abcGistId'] = identityClaimGHToAbc;
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      claims: identityInfoClaims,
    };
    await gestaltGraph.linkNodeAndIdentity(nodeInfo, identityInfo);
    await gestaltGraph.setGestaltActionByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
      'scan',
    );
    await gestaltGraph.setGestaltActionByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
      'notify',
    );
    let nodePerms;
    nodePerms = await acl.getNodePerms();
    expect(Object.keys(nodePerms)).toHaveLength(1);
    await gestaltGraph.unlinkNodeAndIdentity(
      nodeInfo.id,
      identityInfo.providerId,
      identityInfo.identityId,
    );
    const actions1 = await gestaltGraph.getGestaltActionsByNode(nodeInfo.id);
    const actions2 = await gestaltGraph.getGestaltActionsByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(actions1).toEqual({ scan: null, notify: null });
    // Identity no longer has attached node therefore it has no permissions
    expect(actions2).toBeUndefined();
    nodePerms = await acl.getNodePerms();
    expect(Object.keys(nodePerms)).toHaveLength(1);
    await gestaltGraph.destroy();
  });
  test('removing a gestalt removes the permission', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    // NodeInfo on node 'abc'. Contains claims:
    // abc -> dee
    const nodeInfo1Chain: ChainData = {};
    nodeInfo1Chain['A'] = nodeClaimAbcToDee;
    const nodeInfo1: NodeInfo = {
      id: 'abc' as NodeId,
      chain: nodeInfo1Chain,
    };
    // NodeInfo on node 'dee'. Contains claims:
    // dee -> abc
    const nodeInfo2Chain: ChainData = {};
    nodeInfo2Chain['A'] = nodeClaimDeeToAbc;
    const nodeInfo2: NodeInfo = {
      id: 'dee' as NodeId,
      chain: nodeInfo2Chain,
    };
    await gestaltGraph.linkNodeAndNode(nodeInfo1, nodeInfo2);
    await gestaltGraph.setGestaltActionByNode(nodeInfo1.id, 'scan');
    await gestaltGraph.setGestaltActionByNode(nodeInfo1.id, 'notify');
    let nodePerms;
    nodePerms = await acl.getNodePerms();
    expect(Object.keys(nodePerms)).toHaveLength(1);
    await gestaltGraph.unsetNode(nodeInfo1.id);
    // It's still 1 node perm
    // its just that node 1 is eliminated
    nodePerms = await acl.getNodePerms();
    expect(Object.keys(nodePerms)).toHaveLength(1);
    expect(nodePerms[0]).not.toHaveProperty(nodeInfo1.id);
    expect(nodePerms[0]).toHaveProperty(nodeInfo2.id);
    await gestaltGraph.unsetNode(nodeInfo2.id);
    nodePerms = await acl.getNodePerms();
    expect(Object.keys(nodePerms)).toHaveLength(0);
    await gestaltGraph.destroy();
  });
});
