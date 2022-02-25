import type { TLSConfig } from '@/network/types';
import type { NodeIdEncoded, NodeInfo } from '@/nodes/types';
import type * as grpc from '@grpc/grpc-js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import GestaltGraph from '@/gestalts/GestaltGraph';
import ACL from '@/acl/ACL';
import KeyManager from '@/keys/KeyManager';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeManager from '@/nodes/NodeManager';
import Sigchain from '@/sigchain/Sigchain';
import ForwardProxy from '@/network/ForwardProxy';
import ReverseProxy from '@/network/ReverseProxy';
import GRPCClientAgent from '@/agent/GRPCClientAgent';
import VaultManager from '@/vaults/VaultManager';
import NotificationsManager from '@/notifications/NotificationsManager';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as vaultsPB from '@/proto/js/polykey/v1/vaults/vaults_pb';
import * as nodesPB from '@/proto/js/polykey/v1/nodes/nodes_pb';
import * as agentErrors from '@/agent/errors';
import * as keysUtils from '@/keys/utils';
import * as nodesUtils from '@/nodes/utils';
import * as testAgentUtils from './utils';
import * as testUtils from '../utils';

describe(GRPCClientAgent.name, () => {
  const password = 'password';
  const logger = new Logger(`${GRPCClientAgent.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const node1: NodeInfo = {
    id: 'v359vgrgmqf1r5g4fvisiddjknjko6bmm4qv7646jr7fi9enbfuug' as NodeIdEncoded,
    chain: {},
  };
  const nodeId1 = nodesUtils.decodeNodeId(node1.id)!;
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValue(globalKeyPair);
  });
  afterAll(async () => {
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
  });
  let client: GRPCClientAgent;
  let server: grpc.Server;
  let port: number;
  let dataDir: string;
  let keysPath: string;
  let vaultsPath: string;
  let dbPath: string;
  let keyManager: KeyManager;
  let vaultManager: VaultManager;
  let nodeGraph: NodeGraph;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let sigchain: Sigchain;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let db: DB;
  let notificationsManager: NotificationsManager;
  let fwdProxy: ForwardProxy;
  let revProxy: ReverseProxy;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    keysPath = path.join(dataDir, 'keys');
    vaultsPath = path.join(dataDir, 'vaults');
    dbPath = path.join(dataDir, 'db');
    keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      fs: fs,
      logger: logger,
    });
    const tlsConfig: TLSConfig = {
      keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
      certChainPem: await keyManager.getRootCertChainPem(),
    };
    fwdProxy = new ForwardProxy({
      authToken: 'abc',
      logger: logger,
    });
    await fwdProxy.start({
      tlsConfig,
    });
    revProxy = new ReverseProxy({
      logger: logger,
    });
    db = await DB.createDB({
      dbPath: dbPath,
      fs: fs,
      logger: logger,
      crypto: {
        key: keyManager.dbKey,
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
    });
    acl = await ACL.createACL({
      db: db,
      logger: logger,
    });
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      db: db,
      acl: acl,
      logger: logger,
    });
    sigchain = await Sigchain.createSigchain({
      keyManager: keyManager,
      db: db,
      logger: logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger,
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyManager,
      nodeGraph,
      fwdProxy: fwdProxy,
      revProxy: revProxy,
      logger,
    });
    await nodeConnectionManager.start();
    nodeManager = new NodeManager({
      db: db,
      sigchain: sigchain,
      keyManager: keyManager,
      nodeGraph: nodeGraph,
      nodeConnectionManager: nodeConnectionManager,
      logger: logger,
    });
    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl: acl,
        db: db,
        nodeConnectionManager: nodeConnectionManager,
        nodeManager: nodeManager,
        keyManager: keyManager,
        messageCap: 5,
        logger: logger,
      });
    vaultManager = await VaultManager.createVaultManager({
      keyManager: keyManager,
      vaultsPath: vaultsPath,
      nodeConnectionManager: nodeConnectionManager,
      vaultsKey: keyManager.vaultKey,
      db: db,
      acl: acl,
      gestaltGraph: gestaltGraph,
      fs: fs,
      logger: logger,
    });
    [server, port] = await testAgentUtils.openTestAgentServer({
      keyManager,
      vaultManager,
      nodeManager,
      nodeConnectionManager,
      sigchain,
      nodeGraph,
      notificationsManager,
    });
    client = await testAgentUtils.openTestAgentClient(port);
  }, global.defaultTimeout);
  afterEach(async () => {
    await testAgentUtils.closeTestAgentClient(client);
    await testAgentUtils.closeTestAgentServer(server);
    await vaultManager.stop();
    await notificationsManager.stop();
    await sigchain.stop();
    await nodeConnectionManager.stop();
    await nodeGraph.stop();
    await gestaltGraph.stop();
    await acl.stop();
    await fwdProxy.stop();
    await db.stop();
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('GRPCClientAgent readiness', async () => {
    await client.destroy();
    await expect(async () => {
      await client.echo(new utilsPB.EchoMessage());
    }).rejects.toThrow(agentErrors.ErrorAgentClientDestroyed);
  });
  test('echo', async () => {
    const echoMessage = new utilsPB.EchoMessage();
    echoMessage.setChallenge('yes');
    await client.echo(echoMessage);
    const response = await client.echo(echoMessage);
    expect(response.getChallenge()).toBe('yes');
  });
  test.skip('can check permissions', async () => {
    // FIXME: permissions not implemented on vaults.
    // const vault = await vaultManager.createVault('TestAgentVault' as VaultName);
    await gestaltGraph.setNode(node1);
    // Await vaultManager.setVaultPermissions('12345' as NodeId, vault.vaultId);
    // await vaultManager.unsetVaultPermissions('12345' as NodeId, vault.vaultId);
    const vaultPermMessage = new vaultsPB.NodePermission();
    vaultPermMessage.setNodeId(nodesUtils.encodeNodeId(nodeId1));
    // VaultPermMessage.setVaultId(vault.vaultId);
    const response = await client.vaultsPermissionsCheck(vaultPermMessage);
    expect(response.getPermission()).toBeFalsy();
    // Await vaultManager.setVaultPermissions('12345' as NodeId, vault.vaultId);
    const response2 = await client.vaultsPermissionsCheck(vaultPermMessage);
    expect(response2.getPermission()).toBeTruthy();
    // Await vaultManager.deleteVault(vault.vaultId);
  });
  test.skip('can scan vaults', async () => {
    // FIXME, permissions not implemented on vaults
    // const vault = await vaultManager.createVault('TestAgentVault' as VaultName);
    await gestaltGraph.setNode(node1);
    const nodeIdMessage = new nodesPB.Node();
    nodeIdMessage.setNodeId(nodesUtils.encodeNodeId(nodeId1));
    const response = client.vaultsScan(nodeIdMessage);
    const data: string[] = [];
    for await (const resp of response) {
      const chunk = resp.getNameOrId();
      data.push(Buffer.from(chunk).toString());
    }
    expect(data).toStrictEqual([]);
    fail();
    // Await vaultManager.setVaultPermissions('12345' as NodeId, vault.vaultId);
    // const response2 = client.vaultsScan(nodeIdMessage);
    // Const data2: string[] = [];
    // for await (const resp of response2) {
    // Const chunk = resp.getNameOrId();
    // Data2.push(Buffer.from(chunk).toString());
    // }
    // Expect(data2).toStrictEqual([`${vault.vaultName}\t${vault.vaultId}`]);
    // await vaultManager.deleteVault(vault.vaultId);
  });
  test('Can connect over insecure connection.', async () => {
    const echoMessage = new utilsPB.EchoMessage();
    echoMessage.setChallenge('yes');
    await client.echo(echoMessage);
    const response = await client.echo(echoMessage);
    expect(response.getChallenge()).toBe('yes');
    expect(client.secured).toBeFalsy();
  });
});
