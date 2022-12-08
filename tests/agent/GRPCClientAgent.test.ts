import type { Host, Port } from '@/network/types';
import type * as grpc from '@grpc/grpc-js';
import type { NodeId } from '@/ids/types';
import type { Key } from '@/keys/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import TaskManager from '@/tasks/TaskManager';
import GestaltGraph from '@/gestalts/GestaltGraph';
import ACL from '@/acl/ACL';
import KeyRing from '@/keys/KeyRing';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeManager from '@/nodes/NodeManager';
import Sigchain from '@/sigchain/Sigchain';
import Proxy from '@/network/Proxy';
import GRPCClientAgent from '@/agent/GRPCClientAgent';
import VaultManager from '@/vaults/VaultManager';
import NotificationsManager from '@/notifications/NotificationsManager';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as agentErrors from '@/agent/errors';
import * as keysUtils from '@/keys/utils';
import { timerStart } from '@/utils';
import * as utils from '@/utils/index';
import * as testAgentUtils from './utils';
import * as testsUtils from '../utils';

describe(GRPCClientAgent.name, () => {
  const host = '127.0.0.1' as Host;
  const password = 'password';
  const logger = new Logger(`${GRPCClientAgent.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let client: GRPCClientAgent;
  let server: grpc.Server;
  let port: Port;
  let dataDir: string;
  let keysPath: string;
  let vaultsPath: string;
  let dbPath: string;
  let keyRing: KeyRing;
  let vaultManager: VaultManager;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let sigchain: Sigchain;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let db: DB;
  let notificationsManager: NotificationsManager;
  let proxy: Proxy;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    keysPath = path.join(dataDir, 'keys');
    vaultsPath = path.join(dataDir, 'vaults');
    dbPath = path.join(dataDir, 'db');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      fs: fs,
      logger: logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    const tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    proxy = new Proxy({
      authToken: 'abc',
      logger: logger,
    });
    db = await DB.createDB({
      dbPath: dbPath,
      fs: fs,
      logger: logger,
      crypto: {
        key: keyRing.dbKey,
        ops: {
          encrypt: async (key, plainText) => {
            return keysUtils.encryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(plainText),
            );
          },
          decrypt: async (key, cipherText) => {
            return keysUtils.decryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(cipherText),
            );
          },
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
      keyRing: keyRing,
      db: db,
      logger: logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      nodeGraph,
      proxy,
      taskManager,
      logger,
    });
    nodeManager = new NodeManager({
      db: db,
      sigchain: sigchain,
      keyRing: keyRing,
      nodeGraph: nodeGraph,
      nodeConnectionManager: nodeConnectionManager,
      gestaltGraph,
      taskManager,
      logger: logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({ nodeManager });
    await taskManager.startProcessing();
    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl: acl,
        db: db,
        nodeConnectionManager: nodeConnectionManager,
        nodeManager: nodeManager,
        keyRing: keyRing,
        messageCap: 5,
        logger: logger,
      });
    vaultManager = await VaultManager.createVaultManager({
      keyRing: keyRing,
      vaultsPath: vaultsPath,
      nodeConnectionManager: nodeConnectionManager,
      db: db,
      acl: acl,
      gestaltGraph: gestaltGraph,
      notificationsManager: notificationsManager,
      fs: fs,
      logger: logger,
    });
    [server, port] = await testAgentUtils.openTestAgentServer({
      keyRing,
      vaultManager,
      nodeManager,
      nodeConnectionManager,
      sigchain,
      nodeGraph,
      notificationsManager,
      acl,
      gestaltGraph,
      proxy,
      db,
      logger,
    });
    client = await testAgentUtils.openTestAgentClient(port);
    await proxy.start({
      tlsConfig,
      proxyHost: host,
      forwardHost: host,
      serverHost: host,
      serverPort: port,
    });
  }, globalThis.defaultTimeout);
  afterEach(async () => {
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await testAgentUtils.closeTestAgentClient(client);
    await testAgentUtils.closeTestAgentServer(server);
    await vaultManager.stop();
    await notificationsManager.stop();
    await sigchain.stop();
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await nodeGraph.stop();
    await gestaltGraph.stop();
    await acl.stop();
    await proxy.stop();
    await db.stop();
    await keyRing.stop();
    await taskManager.stop();
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
    let clientProxy1: Proxy;
    let clientKeyRing1: KeyRing;
    let nodeId1: NodeId;

    let clientWithProxies2: GRPCClientAgent;
    let clientProxy2: Proxy;
    let clientKeyRing2: KeyRing;
    let nodeId2: NodeId;

    beforeEach(async () => {
      dataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      // Setting up clients
      clientProxy1 = new Proxy({
        authToken: 'auth',
        logger,
      });
      clientKeyRing1 = await KeyRing.createKeyRing({
        keysPath: path.join(dataDir, 'clientKeys1'),
        password: 'password',
        logger,
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      });
      nodeId1 = clientKeyRing1.getNodeId();
      await clientProxy1.start({
        tlsConfig: await testsUtils.createTLSConfig(clientKeyRing1.keyPair),
        proxyHost: localHost,
        forwardHost: localHost,
        serverHost: host,
        serverPort: port,
      });
      clientWithProxies1 = await GRPCClientAgent.createGRPCClientAgent({
        host: localHost,
        nodeId: keyRing.getNodeId(),
        port: proxy.getProxyPort(),
        proxyConfig: {
          host: clientProxy1.getForwardHost(),
          port: clientProxy1.getForwardPort(),
          authToken: clientProxy1.authToken,
        },
        timer: timerStart(5000),
        logger,
      });

      clientProxy2 = new Proxy({
        authToken: 'auth',
        logger,
      });
      clientKeyRing2 = await KeyRing.createKeyRing({
        keysPath: path.join(dataDir, 'clientKeys2'),
        password: 'password',
        logger,
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      });
      nodeId2 = clientKeyRing2.getNodeId();
      await clientProxy2.start({
        tlsConfig: await testsUtils.createTLSConfig(clientKeyRing2.keyPair),
        proxyHost: localHost,
        forwardHost: localHost,
        serverHost: host,
        serverPort: port,
      });
      clientWithProxies2 = await GRPCClientAgent.createGRPCClientAgent({
        host: localHost,
        logger,
        nodeId: keyRing.getNodeId(),
        port: proxy.getProxyPort(),
        proxyConfig: {
          host: clientProxy2.getForwardHost(),
          port: clientProxy2.getForwardPort(),
          authToken: clientProxy2.authToken,
        },
        timer: timerStart(5000),
      });
    });
    afterEach(async () => {
      await testAgentUtils.closeTestAgentClient(clientWithProxies1);
      await clientProxy1.stop();
      await clientKeyRing1.stop();
      await testAgentUtils.closeTestAgentClient(clientWithProxies2);
      await clientProxy2.stop();
      await clientKeyRing2.stop();
    });
    test('connectionInfoGetter returns correct information for each connection', async () => {
      // We can't directly spy on the connectionInfoGetter result
      // but we can check that it called `getConnectionInfoByProxy` properly
      const getConnectionInfoByProxySpy = jest.spyOn(
        Proxy.prototype,
        'getConnectionInfoByReverse',
      );
      await clientWithProxies1.echo(new utilsPB.EchoMessage());
      await clientWithProxies2.echo(new utilsPB.EchoMessage());
      // It should've returned the expected information
      const returnedInfo1 = getConnectionInfoByProxySpy.mock.results[0].value;
      expect(returnedInfo1.localPort).toEqual(proxy.getProxyPort());
      expect(returnedInfo1.localHost).toEqual(localHost);
      expect(returnedInfo1.remotePort).toEqual(clientProxy1.getProxyPort());
      expect(returnedInfo1.remoteHost).toEqual(localHost);
      expect(returnedInfo1.remoteNodeId).toStrictEqual(nodeId1);
      // Checking second call
      const returnedInfo2 = getConnectionInfoByProxySpy.mock.results[1].value;
      expect(returnedInfo2.localPort).toEqual(proxy.getProxyPort());
      expect(returnedInfo2.localHost).toEqual(localHost);
      expect(returnedInfo2.remotePort).toEqual(clientProxy2.getProxyPort());
      expect(returnedInfo2.remoteHost).toEqual(localHost);
      expect(returnedInfo2.remoteNodeId).toStrictEqual(nodeId2);
    });
  });
});
