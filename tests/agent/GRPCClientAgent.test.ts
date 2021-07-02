import type { NodeId, NodeInfo } from '@/nodes/types';

import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';

import { GitBackend } from '@/git';
import { KeyManager } from '@/keys';
import { NodeManager } from '@/nodes';
import { VaultManager } from '@/vaults';
import { ACL } from '@/acl';
import { GestaltGraph } from '@/gestalts';
import { agentPB, GRPCClientAgent } from '@/agent';
import { ForwardProxy, ReverseProxy } from '@/network';
import { DB } from '@/db';

import * as testUtils from './utils';

describe('GRPC agent', () => {
  const logger = new Logger('AgentServerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const node1: NodeInfo = {
    id: '12345' as NodeId,
    links: { nodes: {}, identities: {} },
  };

  let client: GRPCClientAgent;
  let server: grpc.Server;
  let port: number;

  let dataDir: string;
  let keysPath: string;
  let vaultsPath: string;
  let nodesPath: string;
  let dbPath: string;

  let keyManager: KeyManager;
  let vaultManager: VaultManager;
  let nodeManager: NodeManager;
  let gitBackend: GitBackend;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let db: DB;

  let fwdProxy: ForwardProxy;
  let revProxy: ReverseProxy;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    keysPath = path.join(dataDir, 'keys');
    vaultsPath = path.join(dataDir, 'vaults');
    nodesPath = path.join(dataDir, 'nodes');
    dbPath = path.join(dataDir, 'db');

    fwdProxy = new ForwardProxy({
      authToken: 'abc',
      logger: logger,
    });

    revProxy = new ReverseProxy({
      logger: logger,
    });

    keyManager = new KeyManager({
      keysPath,
      fs: fs,
      logger: logger,
    });

    db = new DB({
      dbPath: dbPath,
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });

    acl = new ACL({
      db: db,
      logger: logger,
    });

    gestaltGraph = new GestaltGraph({
      db: db,
      acl: acl,
      logger: logger,
    });

    vaultManager = new VaultManager({
      vaultsPath: vaultsPath,
      keyManager: keyManager,
      db: db,
      acl: acl,
      gestaltGraph: gestaltGraph,
      fs: fs,
      logger: logger,
    });

    nodeManager = new NodeManager({
      nodesPath: nodesPath,
      keyManager: keyManager,
      fwdProxy: fwdProxy,
      revProxy: revProxy,
      fs: fs,
      logger: logger,
    });

    gitBackend = new GitBackend({
      getVault: vaultManager.getVault.bind(vaultManager),
      getVaultNames: vaultManager.scanVaults.bind(vaultManager),
      logger: logger,
    });

    await keyManager.start({ password: 'password' });
    await db.start();
    await acl.start();
    await gestaltGraph.start();
    await vaultManager.start({});
    await nodeManager.start({ nodeId: 'NODEID' as NodeId });

    [server, port] = await testUtils.openTestAgentServer({
      keyManager,
      vaultManager,
      nodeManager,
      gitBackend,
    });

    client = await testUtils.openTestAgentClient(port);
  });
  afterEach(async () => {
    await testUtils.closeTestAgentClient(client);
    await testUtils.closeTestAgentServer(server);

    await nodeManager.stop();
    await vaultManager.stop();
    await gestaltGraph.stop();
    await acl.stop();
    await db.stop();
    await keyManager.stop();

    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('echo', async () => {
    const echoMessage = new agentPB.EchoMessage();
    echoMessage.setChallenge('yes');
    await client.echo(echoMessage);
    const response = await client.echo(echoMessage);
    expect(response.getChallenge()).toBe('yes');
  });
  test('can check permissions', async () => {
    const vault = await vaultManager.createVault('TestAgentVault');
    await gestaltGraph.setNode(node1);
    await vaultManager.setVaultPerm('12345', vault.vaultId);
    await vaultManager.unsetVaultPerm('12345', vault.vaultId);
    const vaultPermMessage = new agentPB.VaultPermMessage();
    vaultPermMessage.setNodeid('12345');
    vaultPermMessage.setVaultid(vault.vaultId);
    const response = await client.checkVaultPermissions(vaultPermMessage);
    expect(response.getPermission()).toBeFalsy();
    await vaultManager.setVaultPerm('12345', vault.vaultId);
    const response2 = await client.checkVaultPermissions(vaultPermMessage);
    expect(response2.getPermission()).toBeTruthy();
    await vaultManager.deleteVault(vault.vaultId);
  });
  test('can scan vaults', async () => {
    const vault = await vaultManager.createVault('TestAgentVault');
    await gestaltGraph.setNode(node1);
    const NodeIdMessage = new agentPB.NodeIdMessage();
    NodeIdMessage.setNodeid('12345');
    const response = client.scanVaults(NodeIdMessage);
    const data: string[] = [];
    for await (const resp of response) {
      const chunk = resp.getChunk_asU8();
      data.push(Buffer.from(chunk).toString());
    }
    expect(data).toStrictEqual([]);
    await vaultManager.setVaultPerm('12345', vault.vaultId);
    const response2 = client.scanVaults(NodeIdMessage);
    const data2: string[] = [];
    for await (const resp of response2) {
      const chunk = resp.getChunk_asU8();
      data2.push(Buffer.from(chunk).toString());
    }
    expect(data2).toStrictEqual([`${vault.vaultId}\tTestAgentVault`]);
    await vaultManager.deleteVault(vault.vaultId);
  });
});
