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
import { DB } from '@matrixai/db';

import {
  GestaltGraph,
  utils as gestaltsUtils,
  errors as gestaltErrors,
} from '@/gestalts';
import { ACL } from '@/acl';
import * as keysUtils from '@/keys/utils';
import { utils as nodesUtils } from '@/nodes';
import * as testUtils from '../utils';

describe('GestaltGraph', () => {
  const logger = new Logger('GestaltGraph Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const nodeIdABC = testUtils.generateRandomNodeId();
  const nodeIdABCEncoded = nodesUtils.encodeNodeId(nodeIdABC);
  const nodeIdDEE = testUtils.generateRandomNodeId();
  const nodeIdDEEEncoded = nodesUtils.encodeNodeId(nodeIdDEE);
  const nodeIdDEF = testUtils.generateRandomNodeId();
  const nodeIdDEFEncoded = nodesUtils.encodeNodeId(nodeIdDEF);
  const nodeIdZZZ = testUtils.generateRandomNodeId();
  const nodeIdZZZEncoded = nodesUtils.encodeNodeId(nodeIdZZZ);

  let dataDir: string;
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
    const dbPath = `${dataDir}/db`;
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: await keysUtils.generateKey(),
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
    });
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
          node1: nodeIdABCEncoded,
          node2: nodeIdDEEEncoded,
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
          node1: nodeIdDEEEncoded, // TODO: use type guards for all `as NodeID` usages here.
          node2: nodeIdABCEncoded,
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
          node: nodeIdABCEncoded,
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
          node: nodeIdABCEncoded,
          provider: 'github.com' as ProviderId,
          identity: 'abc' as IdentityId,
        },
        iat: 1618203162,
      },
      signatures: abcSignature,
    };
  });
  afterEach(async () => {
    await acl.stop();
    await acl.destroy();
    await db.stop();
    await db.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('gestaltGraph readiness', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    await expect(gestaltGraph.destroy()).rejects.toThrow(
      gestaltErrors.ErrorGestaltsGraphRunning,
    );
    // Should be a noop
    await gestaltGraph.start();
    await gestaltGraph.stop();
    await gestaltGraph.destroy();
    await expect(gestaltGraph.start()).rejects.toThrow(
      gestaltErrors.ErrorGestaltsGraphDestroyed,
    );
    await expect(gestaltGraph.getGestalts()).rejects.toThrow(
      gestaltErrors.ErrorGestaltsGraphNotRunning,
    );
  });
  test('get, set and unset node', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const nodeInfo: NodeInfo = {
      id: nodeIdABCEncoded,
      chain: {},
    };
    await gestaltGraph.setNode(nodeInfo);
    const gestalt = await gestaltGraph.getGestaltByNode(nodeIdABC);
    const gk = gestaltsUtils.keyFromNode(nodeIdABC);
    expect(gestalt).toStrictEqual({
      matrix: { [gk]: {} },
      nodes: {
        [gk]: {
          id: nodesUtils.encodeNodeId(nodeIdABC),
          chain: nodeInfo.chain,
        },
      },
      identities: {},
    });
    await gestaltGraph.unsetNode(nodeIdABC);
    await gestaltGraph.unsetNode(nodeIdABC);
    await expect(
      gestaltGraph.getGestaltByNode(nodeIdABC),
    ).resolves.toBeUndefined();
    await gestaltGraph.stop();
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
    await gestaltGraph.stop();
    await gestaltGraph.destroy();
  });
  test('setting independent node and identity gestalts', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const nodeInfo: NodeInfo = {
      id: nodeIdABCEncoded,
      chain: {},
    };
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      claims: {},
    };
    await gestaltGraph.setNode(nodeInfo);
    await gestaltGraph.setIdentity(identityInfo);
    const gestaltNode = await gestaltGraph.getGestaltByNode(nodeIdABC);
    const gestaltIdentity = await gestaltGraph.getGestaltByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    const gkNode = gestaltsUtils.keyFromNode(nodeIdABC);
    const gkIdentity = gestaltsUtils.keyFromIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(gestaltNode).toStrictEqual({
      matrix: { [gkNode]: {} },
      nodes: {
        [gkNode]: {
          id: nodesUtils.encodeNodeId(nodeIdABC),
          chain: nodeInfo.chain,
        },
      },
      identities: {},
    });
    expect(gestaltIdentity).toStrictEqual({
      matrix: { [gkIdentity]: {} },
      nodes: {},
      identities: { [gkIdentity]: identityInfo },
    });
    await gestaltGraph.stop();
    await gestaltGraph.destroy();
  });
  test('start and stop preserves state', async () => {
    let gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const nodeInfo: NodeInfo = {
      id: nodeIdABCEncoded,
      chain: {},
    };
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      claims: {},
    };
    await gestaltGraph.setNode(nodeInfo);
    await gestaltGraph.setIdentity(identityInfo);
    await gestaltGraph.stop();

    gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const gestaltNode = await gestaltGraph.getGestaltByNode(nodeIdABC);
    const gestaltIdentity = await gestaltGraph.getGestaltByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    const gkNode = gestaltsUtils.keyFromNode(nodeIdABC);
    const gkIdentity = gestaltsUtils.keyFromIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(gestaltNode).toStrictEqual({
      matrix: { [gkNode]: {} },
      nodes: {
        [gkNode]: {
          id: nodesUtils.encodeNodeId(nodeIdABC),
          chain: nodeInfo.chain,
        },
      },
      identities: {},
    });
    expect(gestaltIdentity).toStrictEqual({
      matrix: { [gkIdentity]: {} },
      nodes: {},
      identities: { [gkIdentity]: identityInfo },
    });
    await gestaltGraph.stop();
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
      id: nodeIdABCEncoded,
      chain: nodeInfo1Chain,
    };
    // NodeInfo on node 'dee'. Contains claims:
    // dee -> abc
    const nodeInfo2Chain: ChainData = {};
    nodeInfo2Chain['A'] = nodeClaimDeeToAbc;
    const nodeInfo2: NodeInfo = {
      id: nodeIdDEEEncoded,
      chain: nodeInfo2Chain,
    };
    await gestaltGraph.linkNodeAndNode(nodeInfo1, nodeInfo2);
    const gestaltNode1 = await gestaltGraph.getGestaltByNode(nodeIdABC);
    const gestaltNode2 = await gestaltGraph.getGestaltByNode(nodeIdDEE);
    expect(gestaltNode1).not.toBeUndefined();
    expect(gestaltNode2).not.toBeUndefined();
    expect(gestaltNode1).toStrictEqual(gestaltNode2);
    const gkNode1 = gestaltsUtils.keyFromNode(nodeIdABC);
    const gkNode2 = gestaltsUtils.keyFromNode(nodeIdDEE);
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
        [gkNode1]: {
          id: nodesUtils.encodeNodeId(nodeIdABC),
          chain: nodeInfo1.chain,
        },
        [gkNode2]: {
          id: nodesUtils.encodeNodeId(nodeIdDEE),
          chain: nodeInfo2.chain,
        },
      },
      identities: {},
    });
    await gestaltGraph.stop();
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
      id: nodeIdABCEncoded,
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
    const gestaltNode = await gestaltGraph.getGestaltByNode(nodeIdABC);
    const gestaltIdentity = await gestaltGraph.getGestaltByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(gestaltNode).not.toBeUndefined();
    expect(gestaltNode).toStrictEqual(gestaltIdentity);
    const gkNode = gestaltsUtils.keyFromNode(nodeIdABC);
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
        [gkNode]: {
          id: nodesUtils.encodeNodeId(nodeIdABC),
          chain: nodeInfo.chain,
        },
      },
      identities: {
        [gkIdentity]: identityInfo,
      },
    });
    await gestaltGraph.stop();
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
      id: nodeIdABCEncoded,
      chain: nodeInfo1Chain,
    };
    // NodeInfo on node 'dee'. Contains claims:
    // dee -> abc
    const nodeInfo2Chain: ChainData = {};
    nodeInfo2Chain['A'] = nodeClaimDeeToAbc;
    const nodeInfo2: NodeInfo = {
      id: nodeIdDEEEncoded,
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
    const gestaltNode1 = await gestaltGraph.getGestaltByNode(nodeIdABC);
    const gestaltNode2 = await gestaltGraph.getGestaltByNode(nodeIdDEE);
    const gestaltIdentity = await gestaltGraph.getGestaltByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(gestaltNode1).not.toBeUndefined();
    expect(gestaltNode2).not.toBeUndefined();
    expect(gestaltIdentity).not.toBeUndefined();
    expect(gestaltNode1).toStrictEqual(gestaltNode2);
    expect(gestaltNode2).toStrictEqual(gestaltIdentity);
    const gkNode1 = gestaltsUtils.keyFromNode(nodeIdABC);
    const gkNode2 = gestaltsUtils.keyFromNode(nodeIdDEE);
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
        [gkNode1]: {
          id: nodesUtils.encodeNodeId(nodeIdABC),
          chain: nodeInfo1.chain,
        },
        [gkNode2]: {
          id: nodesUtils.encodeNodeId(nodeIdDEE),
          chain: nodeInfo2.chain,
        },
      },
      identities: {
        [gkIdentity]: identityInfo,
      },
    });
    await gestaltGraph.stop();
    await gestaltGraph.destroy();
  });
  test('getting all gestalts', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const nodeInfo: NodeInfo = {
      id: nodeIdABCEncoded,
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
    const nodeGestalt = await gestaltGraph.getGestaltByNode(nodeIdABC);
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

    await gestaltGraph.stop();
    await gestaltGraph.destroy();
  });
  test('new node gestalts creates a new acl record', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const nodeInfo: NodeInfo = {
      id: nodeIdABCEncoded,
      chain: {},
    };
    expect(await acl.getNodePerm(nodeIdABC)).toBeUndefined();
    await gestaltGraph.setNode(nodeInfo);
    const perm = await acl.getNodePerm(nodeIdABC);
    expect(perm).toBeDefined();
    expect(perm).toMatchObject({
      gestalt: {},
      vaults: {},
    });
    const actions = await gestaltGraph.getGestaltActionsByNode(nodeIdABC);
    expect(actions).toBeDefined();
    expect(actions).toMatchObject({});
    await gestaltGraph.stop();
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
    await gestaltGraph.stop();
    await gestaltGraph.destroy();
  });
  test('set and unset gestalt actions', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const nodeInfo: NodeInfo = {
      id: nodeIdABCEncoded,
      chain: {},
    };
    await gestaltGraph.setNode(nodeInfo);
    await gestaltGraph.setGestaltActionByNode(nodeIdABC, 'notify');
    let actions;
    actions = await gestaltGraph.getGestaltActionsByNode(nodeIdABC);
    expect(actions).toHaveProperty('notify');
    const perm = await acl.getNodePerm(nodeIdABC);
    expect(perm).toBeDefined();
    expect(perm).toMatchObject({
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await gestaltGraph.unsetGestaltActionByNode(nodeIdABC, 'notify');
    actions = await gestaltGraph.getGestaltActionsByNode(nodeIdABC);
    expect(actions).not.toHaveProperty('notify');
    await gestaltGraph.stop();
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
      id: nodeIdABCEncoded,
      chain: nodeInfo1Chain,
    };
    // NodeInfo on node 'dee'. Contains claims:
    // dee -> abc
    const nodeInfo2Chain: ChainData = {};
    nodeInfo2Chain['A'] = nodeClaimDeeToAbc;
    const nodeInfo2: NodeInfo = {
      id: nodeIdDEEEncoded,
      chain: nodeInfo2Chain,
    };
    await gestaltGraph.linkNodeAndNode(nodeInfo1, nodeInfo2);
    let actions1, actions2;
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeIdABC);
    actions2 = await gestaltGraph.getGestaltActionsByNode(nodeIdDEE);
    expect(actions1).not.toBeUndefined();
    expect(actions2).not.toBeUndefined();
    expect(actions1).toEqual(actions2);
    await gestaltGraph.setGestaltActionByNode(nodeIdABC, 'notify');
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeIdABC);
    actions2 = await gestaltGraph.getGestaltActionsByNode(nodeIdDEE);
    expect(actions1).toEqual({ notify: null });
    expect(actions1).toEqual(actions2);
    await gestaltGraph.stop();
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
      id: nodeIdABCEncoded,
      chain: {},
    };
    const nodeInfo2: NodeInfo = {
      id: nodeIdDEEEncoded,
      chain: {},
    };
    await gestaltGraph.setNode(nodeInfo1);
    await gestaltGraph.setNode(nodeInfo2);
    await gestaltGraph.setGestaltActionByNode(nodeIdABC, 'notify');
    await gestaltGraph.setGestaltActionByNode(nodeIdDEE, 'scan');
    // NodeInfo on node 'abc'. Contains claims:
    // abc -> dee
    const nodeInfo1Chain: ChainData = {};
    nodeInfo1Chain['A'] = nodeClaimAbcToDee;
    const nodeInfo1Linked: NodeInfo = {
      id: nodeIdABCEncoded,
      chain: nodeInfo1Chain,
    };
    // NodeInfo on node 'dee'. Contains claims:
    // dee -> abc
    const nodeInfo2Chain: ChainData = {};
    nodeInfo2Chain['A'] = nodeClaimDeeToAbc;
    const nodeInfo2Linked: NodeInfo = {
      id: nodeIdDEEEncoded,
      chain: nodeInfo2Chain,
    };
    await gestaltGraph.linkNodeAndNode(nodeInfo1Linked, nodeInfo2Linked);
    const actions1 = await gestaltGraph.getGestaltActionsByNode(nodeIdABC);
    const actions2 = await gestaltGraph.getGestaltActionsByNode(nodeIdDEE);
    expect(actions1).not.toBeUndefined();
    expect(actions2).not.toBeUndefined();
    expect(actions1).toEqual({ notify: null, scan: null });
    expect(actions1).toEqual(actions2);
    await gestaltGraph.stop();
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
      id: nodeIdABCEncoded,
      chain: {},
    };
    await gestaltGraph.setNode(nodeInfo1);
    await gestaltGraph.setGestaltActionByNode(nodeIdABC, 'notify');
    // NodeInfo on node 'abc'. Contains claims:
    // abc -> dee
    const nodeInfo1Chain: ChainData = {};
    nodeInfo1Chain['A'] = nodeClaimAbcToDee;
    const nodeInfo1Linked: NodeInfo = {
      id: nodeIdABCEncoded,
      chain: nodeInfo1Chain,
    };
    // NodeInfo on node 'dee'. Contains claims:
    // dee -> abc
    const nodeInfo2Chain: ChainData = {};
    nodeInfo2Chain['A'] = nodeClaimDeeToAbc;
    const nodeInfo2Linked: NodeInfo = {
      id: nodeIdDEEEncoded,
      chain: nodeInfo2Chain,
    };
    await gestaltGraph.linkNodeAndNode(nodeInfo1Linked, nodeInfo2Linked);
    let actions1, actions2;
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeIdABC);
    actions2 = await gestaltGraph.getGestaltActionsByNode(nodeIdDEE);
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
          node1: nodeIdZZZEncoded,
          node2: nodeIdDEEEncoded,
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
      id: nodeIdZZZEncoded,
      chain: nodeInfo3Chain,
    };
    await gestaltGraph.linkNodeAndNode(nodeInfo3Linked, nodeInfo2Linked);
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeIdABC);
    actions2 = await gestaltGraph.getGestaltActionsByNode(nodeIdDEE);
    const actions3 = await gestaltGraph.getGestaltActionsByNode(nodeIdZZZ);
    expect(actions1).not.toBeUndefined();
    expect(actions2).not.toBeUndefined();
    expect(actions3).not.toBeUndefined();
    expect(actions3).toEqual({ notify: null });
    expect(actions3).toEqual(actions2);
    await gestaltGraph.stop();
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
      id: nodeIdABCEncoded,
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
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeIdABC);
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
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeIdABC);
    actions2 = await gestaltGraph.getGestaltActionsByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(actions1).toEqual({ notify: null });
    expect(actions1).toEqual(actions2);
    await gestaltGraph.stop();
    await gestaltGraph.destroy();
  });
  test('linking existing node and existing identity results in merged permission', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const nodeInfo: NodeInfo = {
      id: nodeIdABCEncoded,
      chain: {},
    };
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      claims: {},
    };
    await gestaltGraph.setNode(nodeInfo);
    await gestaltGraph.setIdentity(identityInfo);
    await gestaltGraph.setGestaltActionByNode(nodeIdABC, 'notify');
    // NodeInfo on node 'abc'. Contains claims:
    // abc -> GitHub
    const nodeInfo1Chain: ChainData = {};
    nodeInfo1Chain['A'] = identityClaimAbcToGH;
    const nodeInfoLinked: NodeInfo = {
      id: nodeIdABCEncoded,
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
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeIdABC);
    actions2 = await gestaltGraph.getGestaltActionsByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(actions1).not.toBeUndefined();
    expect(actions2).not.toBeUndefined();
    expect(actions1).toEqual({ notify: null });
    expect(actions1).toEqual(actions2);
    const nodeInfo2: NodeInfo = {
      id: nodeIdDEFEncoded,
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
    await gestaltGraph.setGestaltActionByNode(nodeIdDEF, 'notify');

    const defSignature: Record<NodeId, SignatureData> = {};
    defSignature['def'] = 'defSignature';
    // Identity claim on node abc: def -> GitHub
    const identityClaimDefToGH: Claim = {
      payload: {
        hPrev: null,
        seq: 1,
        data: {
          type: 'identity',
          node: nodeIdDEFEncoded,
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
      id: nodeIdDEFEncoded,
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
          node: nodeIdDEF,
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
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeIdABC);
    actions2 = await gestaltGraph.getGestaltActionsByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    const actions3 = await gestaltGraph.getGestaltActionsByNode(nodeIdDEF);
    expect(actions1).not.toBeUndefined();
    expect(actions2).not.toBeUndefined();
    expect(actions3).not.toBeUndefined();
    expect(actions2).toEqual({ notify: null, scan: null });
    expect(actions1).toEqual(actions2);
    expect(actions2).toEqual(actions3);
    await gestaltGraph.stop();
    await gestaltGraph.destroy();
  });
  test('link existing node to new identity', async () => {
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const nodeInfo: NodeInfo = {
      id: nodeIdABCEncoded,
      chain: {},
    };
    await gestaltGraph.setNode(nodeInfo);
    // NodeInfo on node 'abc'. Contains claims:
    // abc -> GitHub
    const nodeInfo1Chain: ChainData = {};
    nodeInfo1Chain['A'] = identityClaimAbcToGH;
    const nodeInfoLinked: NodeInfo = {
      id: nodeIdABCEncoded,
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
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeIdABC);
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
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeIdABC);
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
    await gestaltGraph.stop();
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
      id: nodeIdABCEncoded,
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
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeIdABC);
    actions2 = await gestaltGraph.getGestaltActionsByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(actions1).not.toBeUndefined();
    expect(actions2).not.toBeUndefined();
    expect(actions1).toEqual(actions2);
    expect(actions1).toEqual({});
    await gestaltGraph.setGestaltActionByNode(nodeIdABC, 'scan');
    await gestaltGraph.setGestaltActionByNode(nodeIdABC, 'notify');
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeIdABC);
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
    await gestaltGraph.stop();
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
      id: nodeIdABCEncoded,
      chain: nodeInfo1Chain,
    };
    // NodeInfo on node 'dee'. Contains claims:
    // dee -> abc
    const nodeInfo2Chain: ChainData = {};
    nodeInfo2Chain['A'] = nodeClaimDeeToAbc;
    const nodeInfo2: NodeInfo = {
      id: nodeIdDEEEncoded,
      chain: nodeInfo2Chain,
    };
    await gestaltGraph.linkNodeAndNode(nodeInfo1, nodeInfo2);
    await gestaltGraph.setGestaltActionByNode(nodeIdABC, 'scan');
    await gestaltGraph.setGestaltActionByNode(nodeIdABC, 'notify');
    let nodePerms;
    nodePerms = await acl.getNodePerms();
    expect(Object.keys(nodePerms)).toHaveLength(1);
    await gestaltGraph.unlinkNodeAndNode(nodeIdABC, nodeIdDEE);
    let actions1, actions2;
    let perm1, perm2;
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeIdABC);
    actions2 = await gestaltGraph.getGestaltActionsByNode(nodeIdDEE);
    expect(actions1).toEqual({ scan: null, notify: null });
    expect(actions2).toEqual({ scan: null, notify: null });
    perm1 = await acl.getNodePerm(nodeIdABC);
    perm2 = await acl.getNodePerm(nodeIdDEE);
    expect(perm1).toEqual(perm2);
    await gestaltGraph.unsetGestaltActionByNode(nodeIdABC, 'notify');
    await gestaltGraph.unsetGestaltActionByNode(nodeIdDEE, 'scan');
    actions1 = await gestaltGraph.getGestaltActionsByNode(nodeIdABC);
    actions2 = await gestaltGraph.getGestaltActionsByNode(nodeIdDEE);
    expect(actions1).toEqual({ scan: null });
    expect(actions2).toEqual({ notify: null });
    perm1 = await acl.getNodePerm(nodeIdABC);
    perm2 = await acl.getNodePerm(nodeIdDEE);
    expect(perm1).not.toEqual(perm2);
    nodePerms = await acl.getNodePerms();
    expect(Object.keys(nodePerms)).toHaveLength(2);
    await gestaltGraph.stop();
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
      id: nodeIdABCEncoded,
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
      nodeIdABC,
      identityInfo.providerId,
      identityInfo.identityId,
    );
    const actions1 = await gestaltGraph.getGestaltActionsByNode(nodeIdABC);
    const actions2 = await gestaltGraph.getGestaltActionsByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(actions1).toEqual({ scan: null, notify: null });
    // Identity no longer has attached node therefore it has no permissions
    expect(actions2).toBeUndefined();
    nodePerms = await acl.getNodePerms();
    expect(Object.keys(nodePerms)).toHaveLength(1);
    await gestaltGraph.stop();
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
      id: nodeIdABCEncoded,
      chain: nodeInfo1Chain,
    };
    // NodeInfo on node 'dee'. Contains claims:
    // dee -> abc
    const nodeInfo2Chain: ChainData = {};
    nodeInfo2Chain['A'] = nodeClaimDeeToAbc;
    const nodeInfo2: NodeInfo = {
      id: nodeIdDEEEncoded,
      chain: nodeInfo2Chain,
    };
    await gestaltGraph.linkNodeAndNode(nodeInfo1, nodeInfo2);
    await gestaltGraph.setGestaltActionByNode(nodeIdABC, 'scan');
    await gestaltGraph.setGestaltActionByNode(nodeIdABC, 'notify');
    let nodePerms = await acl.getNodePerms();
    expect(Object.keys(nodePerms)).toHaveLength(1);
    await gestaltGraph.unsetNode(nodeIdABC);
    // It's still 1 node perm
    // its just that node 1 is eliminated
    nodePerms = await acl.getNodePerms();
    expect(Object.keys(nodePerms)).toHaveLength(1);
    expect(nodePerms[0]).not.toHaveProperty(nodeIdABC.toString());
    expect(nodePerms[0]).toHaveProperty(nodeIdDEE.toString());
    await gestaltGraph.unsetNode(nodeIdDEE);
    nodePerms = await acl.getNodePerms();
    expect(Object.keys(nodePerms)).toHaveLength(0);
    await gestaltGraph.stop();
    await gestaltGraph.destroy();
  });
});
