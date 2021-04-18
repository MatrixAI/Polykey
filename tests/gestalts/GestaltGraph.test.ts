import type { NodeId, NodeInfo } from '@/nodes/types';
import type { IdentityId, IdentityInfo, ProviderId } from '@/identities/types';

import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { GestaltGraph, utils as gestaltsUtils } from '@/gestalts';
import { KeyManager } from '@/keys';

describe('GestaltGraph', () => {
  const logger = new Logger('GestaltGraph Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let keyManager: KeyManager;
  beforeEach(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'polykey-test-'));
    const keysPath = `${dataDir}/keys`;
    keyManager = new KeyManager({ keysPath, logger });
    await keyManager.start({ password: 'password' });
  });
  afterEach(async () => {
    await keyManager.stop();
    await fs.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('construction has no side effects', async () => {
    const gestaltsPath = `${dataDir}/gestalts`;
    new GestaltGraph({ gestaltsPath, keyManager, logger });
    await expect(fs.stat(gestaltsPath)).rejects.toThrow(/ENOENT/);
  });
  test('async start constructs the graph leveldb', async () => {
    const gestaltsPath = `${dataDir}/gestalts`;
    const gestaltGraph = new GestaltGraph({ gestaltsPath, keyManager, logger });
    await gestaltGraph.start();
    const gestaltsPathContents = await fs.readdir(gestaltsPath);
    expect(gestaltsPathContents).toContain('graph_db');
    await gestaltGraph.stop();
  });
  test('start and stop preserves the graph key', async () => {
    const gestaltsPath = `${dataDir}/gestalts`;
    const gestaltGraph = new GestaltGraph({ gestaltsPath, keyManager, logger });
    await gestaltGraph.start();
    const graphDbKey = await keyManager.getKey('GestaltGraph');
    await gestaltGraph.stop();
    await gestaltGraph.start();
    const graphDbKey_ = await keyManager.getKey('GestaltGraph');
    await gestaltGraph.stop();
    expect(graphDbKey).toEqual(graphDbKey_);
  });
  test('get, set and unset node', async () => {
    const gestaltsPath = `${dataDir}/gestalts`;
    const gestaltGraph = new GestaltGraph({ gestaltsPath, keyManager, logger });
    await gestaltGraph.start();
    const nodeInfo: NodeInfo = {
      id: 'abc' as NodeId,
      links: {
        nodes: {},
        identities: {},
      },
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
    await gestaltGraph.stop();
  });
  test('get, set and unset identity', async () => {
    const gestaltsPath = `${dataDir}/gestalts`;
    const gestaltGraph = new GestaltGraph({ gestaltsPath, keyManager, logger });
    await gestaltGraph.start();
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      links: {
        nodes: {},
      },
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
  });
  test('setting independent node and identity gestalts', async () => {
    const gestaltsPath = `${dataDir}/gestalts`;
    const gestaltGraph = new GestaltGraph({ gestaltsPath, keyManager, logger });
    await gestaltGraph.start();
    const nodeInfo: NodeInfo = {
      id: 'abc' as NodeId,
      links: {
        nodes: {},
        identities: {},
      },
    };
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      links: {
        nodes: {},
      },
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
    await gestaltGraph.stop();
  });
  test('start and stop preserves state', async () => {
    const gestaltsPath = `${dataDir}/gestalts`;
    const gestaltGraph = new GestaltGraph({ gestaltsPath, keyManager, logger });
    await gestaltGraph.start();
    const nodeInfo: NodeInfo = {
      id: 'abc' as NodeId,
      links: {
        nodes: {},
        identities: {},
      },
    };
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      links: {
        nodes: {},
      },
    };
    await gestaltGraph.setNode(nodeInfo);
    await gestaltGraph.setIdentity(identityInfo);
    await gestaltGraph.stop();
    await gestaltGraph.start();
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
    await gestaltGraph.stop();
  });
  test('link node to node', async () => {
    const gestaltsPath = `${dataDir}/gestalts`;
    const gestaltGraph = new GestaltGraph({ gestaltsPath, keyManager, logger });
    await gestaltGraph.start();
    const nodeInfo1: NodeInfo = {
      id: 'abc' as NodeId,
      links: {
        nodes: {
          [gestaltsUtils.keyFromNode('dee' as NodeId)]: {
            type: 'node',
            node1: 'abc',
            node2: 'dee',
            timestamp: 1618203162,
            id: 'link1',
          },
        },
        identities: {},
      },
    };
    const nodeInfo2: NodeInfo = {
      id: 'dee' as NodeId,
      links: {
        nodes: {
          [gestaltsUtils.keyFromNode('abc' as NodeId)]: {
            type: 'node',
            node1: 'dee',
            node2: 'abc',
            timestamp: 1618203162,
            id: 'link2',
          },
        },
        identities: {},
      },
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
    await gestaltGraph.stop();
  });
  test('link node to identity', async () => {
    const gestaltsPath = `${dataDir}/gestalts`;
    const gestaltGraph = new GestaltGraph({ gestaltsPath, keyManager, logger });
    await gestaltGraph.start();
    const nodeInfo: NodeInfo = {
      id: 'abc' as NodeId,
      links: {
        nodes: {},
        identities: {
          [gestaltsUtils.keyFromIdentity(
            'github.com' as ProviderId,
            'abc' as IdentityId,
          )]: {
            type: 'identity',
            node: 'abc' as NodeId,
            provider: 'github.com' as ProviderId,
            identity: 'abc' as IdentityId,
            timestamp: 1618203162,
            id: 'link1',
            signature: 'testsignature',
          },
        },
      },
    };
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      links: {
        nodes: {
          [gestaltsUtils.keyFromNode('abc' as NodeId)]: {
            type: 'identity',
            node: 'abc' as NodeId,
            provider: 'github.com' as ProviderId,
            identity: 'abc' as IdentityId,
            timestamp: 1618203162,
            id: 'abc',
            signature: 'testsignature',
          },
        },
      },
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
    await gestaltGraph.stop();
  });
  test('link node to node and identity', async () => {
    const gestaltsPath = `${dataDir}/gestalts`;
    const gestaltGraph = new GestaltGraph({ gestaltsPath, keyManager, logger });
    await gestaltGraph.start();
    const nodeInfo1: NodeInfo = {
      id: 'abc' as NodeId,
      links: {
        nodes: {
          [gestaltsUtils.keyFromNode('dee' as NodeId)]: {
            type: 'node',
            node1: 'abc',
            node2: 'dee',
            timestamp: 1618203162,
            id: 'link1',
          },
        },
        identities: {
          [gestaltsUtils.keyFromIdentity(
            'github.com' as ProviderId,
            'abc' as IdentityId,
          )]: {
            type: 'identity',
            node: 'abc' as NodeId,
            provider: 'github.com' as ProviderId,
            identity: 'abc' as IdentityId,
            timestamp: 1618203162,
            id: 'link2',
          },
        },
      },
    };
    const nodeInfo2: NodeInfo = {
      id: 'dee' as NodeId,
      links: {
        nodes: {
          [gestaltsUtils.keyFromNode('abc' as NodeId)]: {
            type: 'node',
            node1: 'dee',
            node2: 'abc',
            timestamp: 1618203162,
            id: 'link1',
          },
        },
        identities: {},
      },
    };
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      links: {
        nodes: {
          [gestaltsUtils.keyFromNode('abc' as NodeId)]: {
            type: 'identity',
            node: 'abc' as NodeId,
            provider: 'github.com' as ProviderId,
            identity: 'abc' as IdentityId,
            timestamp: 1618203162,
            id: 'abc',
          },
        },
      },
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
    await gestaltGraph.stop();
  });
  test('getting all gestalts', async () => {
    const gestaltsPath = `${dataDir}/gestalts`;
    const gestaltGraph = new GestaltGraph({ gestaltsPath, keyManager, logger });
    await gestaltGraph.start();
    const nodeInfo: NodeInfo = {
      id: 'abc' as NodeId,
      links: {
        nodes: {},
        identities: {},
      },
    };
    await gestaltGraph.setNode(nodeInfo);
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      links: {
        nodes: {},
      },
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
    await gestaltGraph.stop();
  });
});
