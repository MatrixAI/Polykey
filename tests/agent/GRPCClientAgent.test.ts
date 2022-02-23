import type { Host, Port, TLSConfig } from '@/network/types';
import type * as grpc from '@grpc/grpc-js';
import type { NodeId } from '@/nodes/types';
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
import * as agentErrors from '@/agent/errors';
import * as keysUtils from '@/keys/utils';
import * as testAgentUtils from './utils';

describe(GRPCClientAgent.name, () => {
  const host = '127.0.0.1' as Host;
  const password = 'password';
  const logger = new Logger(`${GRPCClientAgent.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  beforeAll(async () => {
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockImplementation((bits, _) => keysUtils.generateKeyPair(bits));
  });
  afterAll(async () => {
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
      egressHost: host,
      proxyHost: host,
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
      nodeManager: nodeManager,
      db: db,
      acl: acl,
      gestaltGraph: gestaltGraph,
      notificationsManager: notificationsManager,
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
      acl,
      gestaltGraph,
      revProxy,
    });
    await revProxy.start({
      ingressHost: host,
      serverHost: host,
      serverPort: port as Port,
      tlsConfig: tlsConfig,
    });
    client = await testAgentUtils.openTestAgentClient(port);
  }, global.defaultTimeout);
  afterEach(async () => {
    await testAgentUtils.closeTestAgentClient(client);
    await testAgentUtils.closeTestAgentServer(server);
    await revProxy.stop();
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
  test('Can connect over insecure connection.', async () => {
    const echoMessage = new utilsPB.EchoMessage();
    echoMessage.setChallenge('yes');
    await client.echo(echoMessage);
    const response = await client.echo(echoMessage);
    expect(response.getChallenge()).toBe('yes');
    expect(client.secured).toBeFalsy();
  });
  describe('With connection through proxies', () => {
    const logger = new Logger(`${GRPCClientAgent.name} test`, LogLevel.WARN, [
      new StreamHandler(),
    ]);
    const localHost = '127.0.0.1' as Host;

    let clientWithProxies1: GRPCClientAgent;
    let clientFwdProxy1: ForwardProxy;
    let clientKeyManager1: KeyManager;
    let nodeId1: NodeId;

    let clientWithProxies2: GRPCClientAgent;
    let clientFwdProxy2: ForwardProxy;
    let clientKeyManager2: KeyManager;
    let nodeId2: NodeId;

    beforeEach(async () => {
      dataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      // Setting up clients
      clientFwdProxy1 = new ForwardProxy({
        authToken: 'auth',
        logger,
      });
      clientKeyManager1 = await KeyManager.createKeyManager({
        keysPath: path.join(dataDir, 'clientKeys1'),
        password: 'password',
        logger,
      });
      nodeId1 = clientKeyManager1.getNodeId();
      await clientFwdProxy1.start({
        tlsConfig: {
          keyPrivatePem: clientKeyManager1.getRootKeyPairPem().privateKey,
          certChainPem: await clientKeyManager1.getRootCertChainPem(),
        },
        egressHost: localHost,
        proxyHost: localHost,
      });
      clientWithProxies1 = await GRPCClientAgent.createGRPCClientAgent({
        host: localHost,
        nodeId: keyManager.getNodeId(),
        port: revProxy.getIngressPort(),
        proxyConfig: {
          host: clientFwdProxy1.getProxyHost(),
          port: clientFwdProxy1.getProxyPort(),
          authToken: clientFwdProxy1.authToken,
        },
        timeout: 5000,
        logger,
      });

      clientFwdProxy2 = new ForwardProxy({
        authToken: 'auth',
        logger,
      });
      clientKeyManager2 = await KeyManager.createKeyManager({
        keysPath: path.join(dataDir, 'clientKeys2'),
        password: 'password',
        logger,
      });
      nodeId2 = clientKeyManager2.getNodeId();
      await clientFwdProxy2.start({
        tlsConfig: {
          keyPrivatePem: clientKeyManager2.getRootKeyPairPem().privateKey,
          certChainPem: await clientKeyManager2.getRootCertChainPem(),
        },
        egressHost: localHost,
        proxyHost: localHost,
      });
      clientWithProxies2 = await GRPCClientAgent.createGRPCClientAgent({
        host: '127.0.0.1' as Host,
        logger,
        nodeId: keyManager.getNodeId(),
        port: revProxy.getIngressPort(),
        proxyConfig: {
          host: clientFwdProxy2.getProxyHost(),
          port: clientFwdProxy2.getProxyPort(),
          authToken: clientFwdProxy2.authToken,
        },
        timeout: 5000,
      });
    }, 26000);
    afterEach(async () => {
      await testAgentUtils.closeTestAgentClient(clientWithProxies1);
      await clientFwdProxy1.stop();
      await clientKeyManager1.stop();
      await testAgentUtils.closeTestAgentClient(clientWithProxies2);
      await clientFwdProxy2.stop();
      await clientKeyManager2.stop();
    }, 25000);
    test('connectionInfoGetter returns correct information for each connection', async () => {
      // We can't directly spy on the connectionInfoGetter result
      // but we can check that it called `getConnectionInfoByProxy` properly
      const getConnectionInfoByProxySpy = jest.spyOn(
        ReverseProxy.prototype,
        'getConnectionInfoByProxy',
      );
      await clientWithProxies1.echo(new utilsPB.EchoMessage());
      await clientWithProxies2.echo(new utilsPB.EchoMessage());
      // It should've returned the expected information
      const returnedInfo1 = getConnectionInfoByProxySpy.mock.results[0].value;
      expect(returnedInfo1.ingressPort).toEqual(revProxy.getIngressPort());
      expect(returnedInfo1.ingressHost).toEqual(localHost);
      expect(returnedInfo1.egressPort).toEqual(clientFwdProxy1.getEgressPort());
      expect(returnedInfo1.egressHost).toEqual(localHost);
      expect(returnedInfo1.nodeId).toStrictEqual(nodeId1);
      // Checking second call
      const returnedInfo2 = getConnectionInfoByProxySpy.mock.results[1].value;
      expect(returnedInfo2.ingressPort).toEqual(revProxy.getIngressPort());
      expect(returnedInfo2.ingressHost).toEqual(localHost);
      expect(returnedInfo2.egressPort).toEqual(clientFwdProxy2.getEgressPort());
      expect(returnedInfo2.egressHost).toEqual(localHost);
      expect(returnedInfo2.nodeId).toStrictEqual(nodeId2);
    });
  });
});
