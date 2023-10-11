import type {
  ClaimIdEncoded,
  IdentityId,
  ProviderId,
  ProviderIdentityClaimId,
  ClaimId,
  NodeId,
  NodeIdEncoded,
} from '@/ids';
import type { TLSConfig } from '@/network/types';
import type {
  Gestalt,
  GestaltIdentityInfo,
  GestaltNodeInfo,
} from '@/gestalts/types';
import type { SignedClaim } from '@/claims/types';
import type { Host } from '@/network/types';
import type { ClaimLinkIdentity } from '@/claims/payloads';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { RPCClient } from '@matrixai/rpc';
import { WebSocketClient } from '@matrixai/ws';
import KeyRing from '@/keys/KeyRing';
import TaskManager from '@/tasks/TaskManager';
import ACL from '@/acl/ACL';
import GestaltGraph from '@/gestalts/GestaltGraph';
import PolykeyAgent from '@/PolykeyAgent';
import Token from '@/tokens/Token';
import IdentitiesManager from '@/identities/IdentitiesManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeManager from '@/nodes/NodeManager';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import Sigchain from '@/sigchain/Sigchain';
import Discovery from '@/discovery/Discovery';
import ClientService from '@/client/ClientService';
import {
  GestaltsActionsGetByIdentity,
  GestaltsActionsSetByIdentity,
  GestaltsActionsUnsetByIdentity,
  GestaltsActionsGetByNode,
  GestaltsActionsSetByNode,
  GestaltsActionsUnsetByNode,
  GestaltsDiscoveryByIdentity,
  GestaltsDiscoveryByNode,
  GestaltsGestaltGetByIdentity,
  GestaltsGestaltGetByNode,
  GestaltsGestaltList,
  GestaltsGestaltTrustByIdentity,
  GestaltsGestaltTrustByNode,
} from '@/client/handlers';
import {
  gestaltsActionsGetByIdentity,
  gestaltsActionsGetByNode,
  gestaltsActionsSetByIdentity,
  gestaltsActionsSetByNode,
  gestaltsActionsUnsetByIdentity,
  gestaltsActionsUnsetByNode,
  gestaltsDiscoveryByIdentity,
  gestaltsDiscoveryByNode,
  gestaltsGestaltGetByIdentity,
  gestaltsGestaltGetByNode,
  gestaltsGestaltList,
  gestaltsGestaltTrustByIdentity,
  gestaltsGestaltTrustByNode,
} from '@/client/callers';
import { encodeProviderIdentityId } from '@/ids';
import * as nodesUtils from '@/nodes/utils';
import * as gestaltUtils from '@/gestalts/utils';
import * as gestaltsErrors from '@/gestalts/errors';
import * as networkUtils from '@/network/utils';
import * as keysUtils from '@/keys/utils';
import * as utils from '@/utils';
import * as testsUtils from '../../utils';
import * as testNodesUtils from '../../nodes/utils';
import TestProvider from '../../identities/TestProvider';

describe('gestaltsActionsByIdentity', () => {
  const logger = new Logger('gestaltsActionsByIdentity test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let taskManager: TaskManager;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    taskManager = await TaskManager.createTaskManager({ db, logger });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    acl = await ACL.createACL({
      db,
      logger,
    });
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      acl,
      db,
      logger,
    });
  });
  afterEach(async () => {
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await acl.stop();
    await gestaltGraph.stop();
    await taskManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('sets/unsets/gets actions by identity', async () => {
    // Setup
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        gestaltsActionsGetByIdentity: new GestaltsActionsGetByIdentity({
          db,
          gestaltGraph,
        }),
        gestaltsActionsSetByIdentity: new GestaltsActionsSetByIdentity({
          db,
          gestaltGraph,
        }),
        gestaltsActionsUnsetByIdentity: new GestaltsActionsUnsetByIdentity({
          db,
          gestaltGraph,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    const rpcClient = new RPCClient({
      manifest: {
        gestaltsActionsGetByIdentity,
        gestaltsActionsSetByIdentity,
        gestaltsActionsUnsetByIdentity,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });

    // Doing the test
    const nodeId = keyRing.getNodeId();
    const node: GestaltNodeInfo = {
      nodeId: nodeId,
    };
    const identity: GestaltIdentityInfo = {
      identityId: 'identityId' as IdentityId,
      providerId: 'providerId' as ProviderId,
    };
    const dummyClaim: ClaimLinkIdentity = {
      typ: 'ClaimLinkIdentity',
      iss: nodesUtils.encodeNodeId(nodeId),
      sub: encodeProviderIdentityId([identity.providerId, identity.identityId]),
      jti: '' as ClaimIdEncoded,
      iat: 0,
      nbf: 0,
      exp: 0,
      aud: '',
      seq: 0,
      prevClaimId: null,
      prevDigest: null,
    };
    const token = Token.fromPayload(dummyClaim);
    token.signWithPrivateKey(keyRing.keyPair);
    const signedClaim = token.toSigned();
    await gestaltGraph.linkNodeAndIdentity(node, identity, {
      claim: signedClaim,
      meta: { providerIdentityClaimId: '' as ProviderIdentityClaimId },
    });

    const action = 'notify' as const;
    const providerMessage = {
      providerId: identity.providerId,
      identityId: identity.identityId,
    };
    const setActionMessage = {
      ...providerMessage,
      action,
    };
    await rpcClient.methods.gestaltsActionsSetByIdentity(setActionMessage);
    // Check for permission
    const getSetResponse =
      await rpcClient.methods.gestaltsActionsGetByIdentity(providerMessage);
    expect(getSetResponse.actionsList).toContainEqual(action);
    // Unset permission
    await rpcClient.methods.gestaltsActionsUnsetByIdentity(setActionMessage);
    // Check permission was removed
    const getUnsetResponse =
      await rpcClient.methods.gestaltsActionsGetByIdentity(providerMessage);
    expect(getUnsetResponse.actionsList).toHaveLength(0);
  });
});
describe('gestaltsActionsByNode', () => {
  const logger = new Logger('gestaltsActionsByNode test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let taskManager: TaskManager;
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    gestaltsActionsGetByNode: typeof gestaltsActionsGetByNode;
    gestaltsActionsSetByNode: typeof gestaltsActionsSetByNode;
    gestaltsActionsUnsetByNode: typeof gestaltsActionsUnsetByNode;
  }>;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    taskManager = await TaskManager.createTaskManager({ db, logger });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    acl = await ACL.createACL({
      db,
      logger,
    });
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      acl,
      db,
      logger,
    });
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        gestaltsActionsGetByNode: new GestaltsActionsGetByNode({
          db,
          gestaltGraph,
        }),
        gestaltsActionsSetByNode: new GestaltsActionsSetByNode({
          db,
          gestaltGraph,
        }),
        gestaltsActionsUnsetByNode: new GestaltsActionsUnsetByNode({
          db,
          gestaltGraph,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        gestaltsActionsGetByNode,
        gestaltsActionsSetByNode,
        gestaltsActionsUnsetByNode,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await acl.stop();
    await gestaltGraph.stop();
    await taskManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('sets/unsets/gets actions by node', async () => {
    const nodeId = keyRing.getNodeId();
    const node: GestaltNodeInfo = {
      nodeId: nodeId,
    };
    await gestaltGraph.setNode(node);
    // Set permission
    const nodeMessage = {
      nodeIdEncoded: nodesUtils.encodeNodeId(nodeId),
    };
    const action = 'notify' as const;
    const requestMessage = {
      ...nodeMessage,
      action,
    };
    await rpcClient.methods.gestaltsActionsSetByNode(requestMessage);
    // Check for permission
    const getSetResponse =
      await rpcClient.methods.gestaltsActionsGetByNode(nodeMessage);
    expect(getSetResponse.actionsList).toContainEqual(action);
    // Unset permission
    await rpcClient.methods.gestaltsActionsUnsetByNode(requestMessage);
    // Check permission was removed
    const getUnsetResponse =
      await rpcClient.methods.gestaltsActionsGetByNode(nodeMessage);
    expect(getUnsetResponse.actionsList).toHaveLength(0);
  });
});
describe('gestaltsDiscoveryByIdentity', () => {
  const logger = new Logger('gestaltsDiscoverByIdentity test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let taskManager: TaskManager;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
  let rpcClient: RPCClient<{
    gestaltsDiscoveryByIdentity: typeof gestaltsDiscoveryByIdentity;
  }>;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let identitiesManager: IdentitiesManager;
  let nodeGraph: NodeGraph;
  let sigchain: Sigchain;
  let nodeManager: NodeManager;
  let nodeConnectionManager: NodeConnectionManager;
  let discovery: Discovery;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    acl = await ACL.createACL({
      db,
      logger,
    });
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      acl,
      db,
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      keyRing,
      sigchain,
      db,
      gestaltGraph,
      logger,
    });
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger: logger.getChild('NodeGraph'),
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      nodeGraph,
      // @ts-ignore: TLS not needed for this test
      tlsConfig: {},
      connectionConnectTimeoutTime: 2000,
      connectionIdleTimeoutTime: 2000,
      logger: logger.getChild('NodeConnectionManager'),
    });
    nodeManager = new NodeManager({
      db,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      gestaltGraph,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      host: localhost as Host,
    });
    discovery = await Discovery.createDiscovery({
      db,
      gestaltGraph,
      identitiesManager,
      keyRing,
      logger,
      nodeManager,
      taskManager,
    });
    await taskManager.startProcessing();
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        gestaltsDiscoveryByIdentity: new GestaltsDiscoveryByIdentity({
          discovery,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        gestaltsDiscoveryByIdentity,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await discovery.stop();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await sigchain.stop();
    await identitiesManager.stop();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await acl.stop();
    await gestaltGraph.stop();
    await taskManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('discovers by identity', async () => {
    const identity: GestaltIdentityInfo = {
      identityId: 'identityId' as IdentityId,
      providerId: 'providerId' as ProviderId,
    };
    const mockDiscoveryByIdentity = jest
      .spyOn(Discovery.prototype, 'queueDiscoveryByIdentity')
      .mockResolvedValue();
    const request = {
      providerId: identity.providerId,
      identityId: identity.identityId,
    };
    await rpcClient.methods.gestaltsDiscoveryByIdentity(request);
    expect(mockDiscoveryByIdentity).toHaveBeenCalled();
    mockDiscoveryByIdentity.mockRestore();
  });
});
describe('gestaltsDiscoveryByNode', () => {
  const logger = new Logger('gestaltsDiscoverByNode test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let taskManager: TaskManager;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    gestaltsDiscoveryByNode: typeof gestaltsDiscoveryByNode;
  }>;
  let tlsConfig: TLSConfig;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let identitiesManager: IdentitiesManager;
  let nodeGraph: NodeGraph;
  let sigchain: Sigchain;
  let nodeManager: NodeManager;
  let nodeConnectionManager: NodeConnectionManager;
  let discovery: Discovery;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    acl = await ACL.createACL({
      db,
      logger,
    });
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      acl,
      db,
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      keyRing,
      sigchain,
      db,
      gestaltGraph,
      logger,
    });
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger: logger.getChild('NodeGraph'),
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      nodeGraph,
      // @ts-ignore: TLS not needed for this test
      tlsConfig: {},
      connectionConnectTimeoutTime: 2000,
      connectionIdleTimeoutTime: 2000,
      logger: logger.getChild('NodeConnectionManager'),
    });
    nodeManager = new NodeManager({
      db,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      gestaltGraph,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({ host: localhost as Host });
    discovery = await Discovery.createDiscovery({
      db,
      gestaltGraph,
      identitiesManager,
      keyRing,
      logger,
      nodeManager,
      taskManager,
    });
    await taskManager.startProcessing();
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        gestaltsDiscoveryByNode: new GestaltsDiscoveryByNode({
          discovery,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        gestaltsDiscoveryByNode,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await discovery.stop();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await sigchain.stop();
    await identitiesManager.stop();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await acl.stop();
    await gestaltGraph.stop();
    await taskManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('discovers by node', async () => {
    const mockDiscoveryByNode = jest
      .spyOn(Discovery.prototype, 'queueDiscoveryByNode')
      .mockResolvedValue();
    const request = {
      nodeIdEncoded: nodesUtils.encodeNodeId(
        testNodesUtils.generateRandomNodeId(),
      ),
    };
    await rpcClient.methods.gestaltsDiscoveryByNode(request);
    expect(mockDiscoveryByNode).toHaveBeenCalled();
    mockDiscoveryByNode.mockRestore();
  });
});
describe('gestaltsGestaltGetByIdentity', () => {
  const logger = new Logger(
    'gestaltsGestaltGetByIdentity test',
    LogLevel.WARN,
    [
      new StreamHandler(
        formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
      ),
    ],
  );
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let taskManager: TaskManager;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
  let rpcClient: RPCClient<{
    gestaltsGestaltGetByIdentity: typeof gestaltsGestaltGetByIdentity;
  }>;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    taskManager = await TaskManager.createTaskManager({ db, logger });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    acl = await ACL.createACL({
      db,
      logger,
    });
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      acl,
      db,
      logger,
    });
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        gestaltsGestaltGetByIdentity: new GestaltsGestaltGetByIdentity({
          db,
          gestaltGraph,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        gestaltsGestaltGetByIdentity,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await acl.stop();
    await gestaltGraph.stop();
    await taskManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets gestalt by identity', async () => {
    const nodeId = keyRing.getNodeId();
    const node: GestaltNodeInfo = {
      nodeId: nodeId,
    };
    const identity: GestaltIdentityInfo = {
      identityId: 'identityId' as IdentityId,
      providerId: 'providerId' as ProviderId,
    };
    const dummyClaim: ClaimLinkIdentity = {
      typ: 'ClaimLinkIdentity',
      iss: nodesUtils.encodeNodeId(nodeId),
      sub: encodeProviderIdentityId([identity.providerId, identity.identityId]),
      jti: '' as ClaimIdEncoded,
      iat: 0,
      nbf: 0,
      exp: 0,
      aud: '',
      seq: 0,
      prevClaimId: null,
      prevDigest: null,
    };
    const token = Token.fromPayload(dummyClaim);
    token.signWithPrivateKey(keyRing.keyPair);
    const signedClaim = token.toSigned();
    await gestaltGraph.linkNodeAndIdentity(node, identity, {
      claim: signedClaim,
      meta: { providerIdentityClaimId: '' as ProviderIdentityClaimId },
    });
    const nodeKey = gestaltUtils.encodeGestaltId(['node', nodeId]);
    const identityKey = gestaltUtils.encodeGestaltId([
      'identity',
      [identity.providerId, identity.identityId],
    ]);
    const expectedGestalt = {
      matrix: {},
      nodes: {},
      identities: {},
    };
    expectedGestalt.matrix[identityKey] = {};
    expectedGestalt.matrix[nodeKey] = {};
    expectedGestalt.matrix[identityKey][nodeKey] = null;
    expectedGestalt.matrix[nodeKey][identityKey] = null;
    expectedGestalt.nodes[nodeKey] = expect.anything();
    expectedGestalt.identities[identityKey] = expect.anything();

    const request = {
      providerId: identity.providerId,
      identityId: identity.identityId,
    };
    const response =
      await rpcClient.methods.gestaltsGestaltGetByIdentity(request);
    expect(response.gestalt).toEqual(expectedGestalt);
  });
});
describe('gestaltsGestaltGetByNode', () => {
  const logger = new Logger('gestaltsGestaltGetByNode test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let taskManager: TaskManager;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
  let rpcClient: RPCClient<{
    gestaltsGestaltGetByNode: typeof gestaltsGestaltGetByNode;
  }>;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    taskManager = await TaskManager.createTaskManager({ db, logger });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    acl = await ACL.createACL({
      db,
      logger,
    });
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      acl,
      db,
      logger,
    });
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        gestaltsGestaltGetByNode: new GestaltsGestaltGetByNode({
          db,
          gestaltGraph,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        gestaltsGestaltGetByNode,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await acl.stop();
    await gestaltGraph.stop();
    await taskManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets gestalt by node', async () => {
    const nodeId = keyRing.getNodeId();
    const node: GestaltNodeInfo = {
      nodeId: nodeId,
    };
    const identity: GestaltIdentityInfo = {
      identityId: 'identityId' as IdentityId,
      providerId: 'providerId' as ProviderId,
    };
    const dummyClaim: ClaimLinkIdentity = {
      typ: 'ClaimLinkIdentity',
      iss: nodesUtils.encodeNodeId(nodeId),
      sub: encodeProviderIdentityId([identity.providerId, identity.identityId]),
      jti: '' as ClaimIdEncoded,
      iat: 0,
      nbf: 0,
      exp: 0,
      aud: '',
      seq: 0,
      prevClaimId: null,
      prevDigest: null,
    };
    const token = Token.fromPayload(dummyClaim);
    token.signWithPrivateKey(keyRing.keyPair);
    const signedClaim = token.toSigned();
    await gestaltGraph.linkNodeAndIdentity(node, identity, {
      claim: signedClaim,
      meta: { providerIdentityClaimId: '' as ProviderIdentityClaimId },
    });
    const nodeKey = gestaltUtils.encodeGestaltId(['node', nodeId]);
    const identityKey = gestaltUtils.encodeGestaltId([
      'identity',
      [identity.providerId, identity.identityId],
    ]);
    const expectedGestalt = {
      matrix: {},
      nodes: {},
      identities: {},
    };
    expectedGestalt.matrix[identityKey] = {};
    expectedGestalt.matrix[nodeKey] = {};
    expectedGestalt.matrix[identityKey][nodeKey] = null;
    expectedGestalt.matrix[nodeKey][identityKey] = null;
    expectedGestalt.nodes[nodeKey] = expect.anything();
    expectedGestalt.identities[identityKey] = expect.anything();

    const request = {
      nodeIdEncoded: nodesUtils.encodeNodeId(nodeId),
    };
    const response = await rpcClient.methods.gestaltsGestaltGetByNode(request);
    expect(response.gestalt).toEqual(expectedGestalt);
  });
});
describe('gestaltsGestaltList', () => {
  const logger = new Logger('gestaltsGestaltList test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let taskManager: TaskManager;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
  let rpcClient: RPCClient<{
    gestaltsGestaltList: typeof gestaltsGestaltList;
  }>;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    taskManager = await TaskManager.createTaskManager({ db, logger });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    acl = await ACL.createACL({
      db,
      logger,
    });
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      acl,
      db,
      logger,
    });
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        gestaltsGestaltList: new GestaltsGestaltList({
          db,
          gestaltGraph,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        gestaltsGestaltList,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await acl.stop();
    await gestaltGraph.stop();
    await taskManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('lists gestalts', async () => {
    const nodeId = keyRing.getNodeId();
    const node: GestaltNodeInfo = {
      nodeId: nodeId,
    };
    const identity: GestaltIdentityInfo = {
      identityId: 'identityId' as IdentityId,
      providerId: 'providerId' as ProviderId,
    };
    await gestaltGraph.setNode(node);
    await gestaltGraph.setIdentity(identity);
    const nodeKey = gestaltUtils.encodeGestaltId(['node', nodeId]);
    const identityKey = gestaltUtils.encodeGestaltId([
      'identity',
      [identity.providerId, identity.identityId],
    ]);
    const expectedNodeGestalt: Gestalt = {
      matrix: {},
      nodes: {},
      identities: {},
    };
    expectedNodeGestalt.matrix[nodeKey] = {};
    expectedNodeGestalt.nodes[nodeKey] = expect.any(Object);
    const expectedIdentityGestalt: Gestalt = {
      matrix: {},
      nodes: {},
      identities: {},
    };
    expectedIdentityGestalt.matrix[identityKey] = {};
    expectedIdentityGestalt.identities[identityKey] = expect.any(Object);

    for await (const response of await rpcClient.methods.gestaltsGestaltList(
      {},
    )) {
      if (Object.keys(response.gestalt.identities).length !== 0) {
        // Should be the identity response
        expect(response.gestalt).toEqual(expectedIdentityGestalt);
      } else {
        // Otherwise the node gestalt
        expect(response.gestalt).toEqual(expectedNodeGestalt);
      }
    }
  });
});
describe('gestaltsGestaltTrustByIdentity', () => {
  const logger = new Logger(
    'gestaltsGestaltTrustByIdentity test',
    LogLevel.WARN,
    [
      new StreamHandler(
        formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
      ),
    ],
  );
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let taskManager: TaskManager;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
  let rpcClient: RPCClient<{
    gestaltsGestaltTrustByIdentity: typeof gestaltsGestaltTrustByIdentity;
  }>;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let identitiesManager: IdentitiesManager;
  let nodeGraph: NodeGraph;
  let sigchain: Sigchain;
  let nodeManager: NodeManager;
  let nodeConnectionManager: NodeConnectionManager;
  let discovery: Discovery;
  let testProvider: TestProvider;
  const connectedIdentity = 'trusted-node' as IdentityId;
  let claimId: ClaimId;
  const nodeChainData: Record<ClaimId, SignedClaim> = {};

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    acl = await ACL.createACL({
      db,
      logger,
    });
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      acl,
      db,
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      keyRing,
      sigchain,
      db,
      gestaltGraph,
      logger,
    });
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger: logger.getChild('NodeGraph'),
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      nodeGraph,
      // @ts-ignore: TLS not needed for this test
      tlsConfig: {},
      connectionConnectTimeoutTime: 2000,
      connectionIdleTimeoutTime: 2000,
      logger: logger.getChild('NodeConnectionManager'),
    });
    nodeManager = new NodeManager({
      db,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      gestaltGraph,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({ host: localhost as Host });
    discovery = await Discovery.createDiscovery({
      db,
      gestaltGraph,
      identitiesManager,
      keyRing,
      logger,
      nodeManager,
      taskManager,
    });
    await taskManager.startProcessing();

    testProvider = new TestProvider();
    identitiesManager.registerProvider(testProvider);
    await identitiesManager.putToken(testProvider.id, connectedIdentity, {
      accessToken: 'abc123',
    });
    testProvider.users['trusted-node'] = {};
    const identityClaim = {
      typ: 'ClaimLinkIdentity',
      iss: nodesUtils.encodeNodeId(keyRing.getNodeId()),
      sub: encodeProviderIdentityId([testProvider.id, connectedIdentity]),
    };
    const [claimId_, claim] = await sigchain.addClaim(identityClaim);
    claimId = claimId_;
    nodeChainData[claimId_] = claim;
    await testProvider.publishClaim(
      connectedIdentity,
      claim as SignedClaim<ClaimLinkIdentity>,
    );
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        gestaltsGestaltTrustByIdentity: new GestaltsGestaltTrustByIdentity({
          db,
          gestaltGraph,
          discovery,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        gestaltsGestaltTrustByIdentity,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await discovery.stop();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await sigchain.stop();
    await identitiesManager.stop();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await acl.stop();
    await gestaltGraph.stop();
    await taskManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('trusts an identity (already set in gestalt graph)', async () => {
    testProvider.users['disconnected-user'] = {};
    await gestaltGraph.linkNodeAndIdentity(
      { nodeId: keyRing.getNodeId() },
      {
        providerId: testProvider.id,
        identityId: connectedIdentity,
      },
      {
        claim: nodeChainData[claimId] as SignedClaim<ClaimLinkIdentity>,
        meta: {
          providerIdentityClaimId: '' as ProviderIdentityClaimId,
        },
      },
    );
    const request = {
      providerId: testProvider.id,
      identityId: connectedIdentity,
    };
    await rpcClient.methods.gestaltsGestaltTrustByIdentity(request);
    expect(
      await gestaltGraph.getGestaltActions([
        'identity',
        [testProvider.id, connectedIdentity],
      ]),
    ).toEqual({
      notify: null,
    });
  });
  test('trusts an identity (new identity)', async () => {
    const request = {
      providerId: testProvider.id,
      identityId: connectedIdentity,
    };
    // Should fail on first attempt - need to allow time for the identity to be
    // linked to a node via discovery
    await testsUtils.expectRemoteError(
      rpcClient.methods.gestaltsGestaltTrustByIdentity(request),
      gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
    );
    // Wait for both identity and node to be set in GG
    let existingTasks: number = 0;
    do {
      existingTasks = await discovery.waitForDiscoveryTasks();
    } while (existingTasks > 0);
    await rpcClient.methods.gestaltsGestaltTrustByIdentity(request);
    expect(
      await gestaltGraph.getGestaltActions([
        'identity',
        [testProvider.id, connectedIdentity],
      ]),
    ).toEqual({
      notify: null,
    });
  });
  test('cannot trust a disconnected identity', async () => {
    testProvider.users['disconnected-user'] = {};
    const request = {
      providerId: testProvider.id,
      identityId: connectedIdentity,
    };
    // Should fail on first attempt - attempt to find a connected node
    await testsUtils.expectRemoteError(
      rpcClient.methods.gestaltsGestaltTrustByIdentity(request),
      gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
    );
    // Wait and try again - should fail again because the identity has no
    // linked nodes we can trust
    await testsUtils.expectRemoteError(
      rpcClient.methods.gestaltsGestaltTrustByIdentity(request),
      gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
    );
  });
  test('trust extends to entire gestalt', async () => {
    await gestaltGraph.linkNodeAndIdentity(
      { nodeId: keyRing.getNodeId() },
      {
        providerId: testProvider.id,
        identityId: connectedIdentity,
      },
      {
        claim: nodeChainData[claimId] as SignedClaim<ClaimLinkIdentity>,
        meta: {
          providerIdentityClaimId: '' as ProviderIdentityClaimId,
        },
      },
    );
    const request = {
      providerId: testProvider.id,
      identityId: connectedIdentity,
    };
    await rpcClient.methods.gestaltsGestaltTrustByIdentity(request);
    expect(
      await gestaltGraph.getGestaltActions([
        'identity',
        [testProvider.id, connectedIdentity],
      ]),
    ).toEqual({
      notify: null,
    });
    expect(
      await gestaltGraph.getGestaltActions(['node', keyRing.getNodeId()]),
    ).toEqual({
      notify: null,
    });
  });
  test('links trusted identity to an existing node', async () => {
    await gestaltGraph.setNode({
      nodeId: keyRing.getNodeId(),
    });
    const request = {
      providerId: testProvider.id,
      identityId: connectedIdentity,
    };
    // Should fail on first attempt - need to allow time for the identity to be
    // linked to a node via discovery
    await testsUtils.expectRemoteError(
      rpcClient.methods.gestaltsGestaltTrustByIdentity(request),
      gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
    );
    // Wait and try again - should succeed second time
    await utils.sleep(2000);
    await rpcClient.methods.gestaltsGestaltTrustByIdentity(request);
    // Wait for both identity and node to be set in GG
    let existingTasks: number = 0;
    do {
      existingTasks = await discovery.waitForDiscoveryTasks();
    } while (existingTasks > 0);
    await rpcClient.methods.gestaltsGestaltTrustByIdentity(request);
    expect(
      await gestaltGraph.getGestaltActions([
        'identity',
        [testProvider.id, connectedIdentity],
      ]),
    ).toEqual({
      notify: null,
    });
    expect(
      await gestaltGraph.getGestaltActions(['node', keyRing.getNodeId()]),
    ).toEqual({
      notify: null,
    });
  });
});
describe('gestaltsGestaltTrustByNode', () => {
  const logger = new Logger('gestaltsGestaltTrustByNode test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let taskManager: TaskManager;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
  let rpcClient: RPCClient<{
    gestaltsGestaltTrustByNode: typeof gestaltsGestaltTrustByNode;
  }>;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let identitiesManager: IdentitiesManager;
  let nodeGraph: NodeGraph;
  let sigchain: Sigchain;
  let nodeManager: NodeManager;
  let nodeConnectionManager: NodeConnectionManager;
  let discovery: Discovery;
  let testProvider: TestProvider;
  const connectedIdentity = 'trusted-node' as IdentityId;
  const nodeChainData: Record<ClaimId, SignedClaim> = {};
  let nodeIdRemote: NodeId;
  let nodeIdEncodedRemote: NodeIdEncoded;
  let node: PolykeyAgent;
  let mockedRequestChainData: jest.SpyInstance;
  let nodeDataDir: string;
  beforeEach(async () => {
    testProvider = new TestProvider();
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    mockedRequestChainData = jest
      .spyOn(NodeManager.prototype, 'requestChainData')
      .mockResolvedValue(nodeChainData);
    nodeDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'trusted-node-'),
    );
    const nodePath = path.join(nodeDataDir, 'polykey');
    node = await PolykeyAgent.createPolykeyAgent({
      password,
      options: {
        nodePath,
        agentServiceHost: localhost,
        clientServiceHost: localhost,
        keys: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      },
      logger,
    });
    nodeIdRemote = node.keyRing.getNodeId();
    nodeIdEncodedRemote = nodesUtils.encodeNodeId(nodeIdRemote);
    node.identitiesManager.registerProvider(testProvider);
    await node.identitiesManager.putToken(testProvider.id, connectedIdentity, {
      accessToken: 'abc123',
    });
    testProvider.users['trusted-node'] = {};
    const identityClaim = {
      typ: 'ClaimLinkIdentity',
      iss: nodeIdEncodedRemote,
      sub: encodeProviderIdentityId([testProvider.id, connectedIdentity]),
    };
    const [claimId, claim] = await node.sigchain.addClaim(identityClaim);
    nodeChainData[claimId] = claim;
    await testProvider.publishClaim(
      connectedIdentity,
      claim as SignedClaim<ClaimLinkIdentity>,
    );

    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    acl = await ACL.createACL({
      db,
      logger,
    });
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      acl,
      db,
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      keyRing,
      sigchain,
      db,
      gestaltGraph,
      logger,
    });
    identitiesManager.registerProvider(testProvider);
    await identitiesManager.putToken(testProvider.id, connectedIdentity, {
      accessToken: 'abc123',
    });
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger: logger.getChild('NodeGraph'),
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      nodeGraph,
      // @ts-ignore: TLS not needed for this test
      tlsConfig: {},
      connectionConnectTimeoutTime: 2000,
      connectionIdleTimeoutTime: 2000,
      logger: logger.getChild('NodeConnectionManager'),
    });
    nodeManager = new NodeManager({
      db,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      gestaltGraph,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({ host: localhost as Host });
    await nodeManager.setNode(nodeIdRemote, {
      host: node.agentServiceHost,
      port: node.agentServicePort,
    });
    discovery = await Discovery.createDiscovery({
      db,
      gestaltGraph,
      identitiesManager,
      keyRing,
      logger,
      nodeManager,
      taskManager,
    });
    await taskManager.startProcessing();
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        gestaltsGestaltTrustByNode: new GestaltsGestaltTrustByNode({
          db,
          gestaltGraph,
          discovery,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        gestaltsGestaltTrustByNode,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await discovery.stop();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await sigchain.stop();
    await identitiesManager.stop();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await acl.stop();
    await gestaltGraph.stop();
    await taskManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    await node.stop();
    await fs.promises.rm(nodeDataDir, {
      force: true,
      recursive: true,
    });
    mockedRequestChainData.mockRestore();
  });
  test('trusts a node (already set in gestalt graph)', async () => {
    await gestaltGraph.setNode({ nodeId: nodeIdRemote });
    const request = {
      nodeIdEncoded: nodeIdEncodedRemote,
    };
    await rpcClient.methods.gestaltsGestaltTrustByNode(request);
    expect(
      await gestaltGraph.getGestaltActions(['node', nodeIdRemote!]),
    ).toEqual({
      notify: null,
    });
  });
  test('trusts a node (new node)', async () => {
    const request = {
      nodeIdEncoded: nodeIdEncodedRemote,
    };
    await rpcClient.methods.gestaltsGestaltTrustByNode(request);
    expect(
      await gestaltGraph.getGestaltActions(['node', nodeIdRemote]),
    ).toEqual({
      notify: null,
    });
  });
  test('trust extends to entire gestalt', async () => {
    const request = {
      nodeIdEncoded: nodeIdEncodedRemote,
    };
    await rpcClient.methods.gestaltsGestaltTrustByNode(request);
    expect(
      await gestaltGraph.getGestaltActions(['node', nodeIdRemote]),
    ).toEqual({
      notify: null,
    });
    // Give discovery process time to complete before checking identity actions
    // Wait for both identity and node to be set in GG
    while ((await discovery.waitForDiscoveryTasks()) > 0) {
      // Waiting for tasks
    }
    expect(
      await gestaltGraph.getGestaltActions([
        'identity',
        [testProvider.id, connectedIdentity],
      ]),
    ).toEqual({
      notify: null,
    });
  });
});
