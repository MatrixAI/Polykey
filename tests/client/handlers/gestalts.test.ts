import type { TLSConfig } from '@/network/types';
import type { ClaimLinkIdentity } from '@/claims/payloads';
import type {
  ClaimIdEncoded,
  IdentityId,
  ProviderId,
  ProviderIdentityClaimId,
  ClaimId,
  NodeId,
  NodeIdEncoded,
} from '@/ids';
import type { GestaltIdentityInfo, GestaltNodeInfo } from '@/gestalts/types';
import type { Gestalt } from '@/gestalts/types';
import type { SignedClaim } from '@/claims/types';
import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import TaskManager from '@/tasks/TaskManager';
import { GestaltsActionsGetByIdentityHandler } from '@/client/handlers/gestaltsActionsGetByIdentity';
import { GestaltsActionsSetByIdentityHandler } from '@/client/handlers/gestaltsActionsSetByIdentity';
import { GestaltsActionsUnsetByIdentityHandler } from '@/client/handlers/gestaltsActionsUnsetByIdentity';
import RPCClient from '@matrixai/rpc/dist/RPCClient';
import WebSocketClient from '@/websockets/WebSocketClient';
import GestaltGraph from '@/gestalts/GestaltGraph';
import ACL from '@/acl/ACL';
import * as nodesUtils from '@/nodes/utils';
import { encodeProviderIdentityId } from '@/ids';
import Token from '@/tokens/Token';
import {
  gestaltsActionsGetByIdentity,
  gestaltsActionsGetByNode,
  GestaltsActionsGetByNodeHandler,
  gestaltsActionsSetByIdentity,
  gestaltsActionsSetByNode,
  GestaltsActionsSetByNodeHandler,
  gestaltsActionsUnsetByIdentity,
  gestaltsActionsUnsetByNode,
  GestaltsActionsUnsetByNodeHandler,
  gestaltsDiscoveryByIdentity,
  GestaltsDiscoveryByIdentityHandler,
  gestaltsDiscoveryByNode,
  GestaltsDiscoveryByNodeHandler,
  gestaltsGestaltGetByIdentity,
  GestaltsGestaltGetByIdentityHandler,
  gestaltsGestaltGetByNode,
  GestaltsGestaltGetByNodeHandler,
  gestaltsGestaltList,
  GestaltsGestaltListHandler,
  gestaltsGestaltTrustByIdentity,
  GestaltsGestaltTrustByIdentityHandler,
  gestaltsGestaltTrustByNode,
  GestaltsGestaltTrustByNodeHandler,
} from '@/client';
import IdentitiesManager from '@/identities/IdentitiesManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeManager from '@/nodes/NodeManager';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import Sigchain from '@/sigchain/Sigchain';
import Discovery from '@/discovery/Discovery';
import * as gestaltUtils from '@/gestalts/utils';
import * as gestaltsErrors from '@/gestalts/errors';
import { sleep } from '@/utils/utils';
import PolykeyAgent from '@/PolykeyAgent';
import ClientService from '@/client/ClientService';
import * as testsUtils from '../../utils';
import TestProvider from '../../identities/TestProvider';
import * as testUtils from '../../utils/utils';
import * as tlsTestsUtils from '../../utils/tls';
import * as testNodesUtils from '../../nodes/utils';

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
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
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
    await clientService?.stop({ force: true });
    await webSocketClient.destroy(true);
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
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        gestaltsActionsGetByIdentity: new GestaltsActionsGetByIdentityHandler({
          db,
          gestaltGraph,
        }),
        gestaltsActionsSetByIdentity: new GestaltsActionsSetByIdentityHandler({
          db,
          gestaltGraph,
        }),
        gestaltsActionsUnsetByIdentity:
          new GestaltsActionsUnsetByIdentityHandler({
            db,
            gestaltGraph,
          }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsActionsGetByIdentity,
        gestaltsActionsSetByIdentity,
        gestaltsActionsUnsetByIdentity,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
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
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
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
    await clientService?.stop({ force: true });
    await webSocketClient.destroy(true);
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
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        gestaltsActionsGetByNode: new GestaltsActionsGetByNodeHandler({
          db,
          gestaltGraph,
        }),
        gestaltsActionsSetByNode: new GestaltsActionsSetByNodeHandler({
          db,
          gestaltGraph,
        }),
        gestaltsActionsUnsetByNode: new GestaltsActionsUnsetByNodeHandler({
          db,
          gestaltGraph,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsActionsGetByNode,
        gestaltsActionsSetByNode,
        gestaltsActionsUnsetByNode,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
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
describe('gestaltsDiscoverByIdentity', () => {
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
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);
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
    await clientService?.stop({ force: true });
    await webSocketClient.destroy(true);
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
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        gestaltsDiscoveryByIdentity: new GestaltsDiscoveryByIdentityHandler({
          discovery,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsDiscoveryByIdentity,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
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
describe('gestaltsDiscoverByNode', () => {
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
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
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
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);
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
    await clientService?.stop({ force: true });
    await webSocketClient.destroy(true);
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
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        gestaltsDiscoveryByNode: new GestaltsDiscoveryByNodeHandler({
          discovery,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsDiscoveryByNode,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
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
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
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
    await clientService?.stop({ force: true });
    await webSocketClient.destroy(true);
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
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        gestaltsGestaltGetByIdentity: new GestaltsGestaltGetByIdentityHandler({
          db,
          gestaltGraph,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsGestaltGetByIdentity,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
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
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
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
    await clientService?.stop({ force: true });
    await webSocketClient.destroy(true);
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
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        gestaltsGestaltGetByNode: new GestaltsGestaltGetByNodeHandler({
          db,
          gestaltGraph,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsGestaltGetByNode,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
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
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
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
    await clientService?.stop({ force: true });
    await webSocketClient.destroy(true);
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
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        gestaltsGestaltList: new GestaltsGestaltListHandler({
          db,
          gestaltGraph,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsGestaltList,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
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
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);
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
    await clientService?.stop({ force: true });
    await webSocketClient.destroy(true);
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
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        gestaltsGestaltTrustByIdentity:
          new GestaltsGestaltTrustByIdentityHandler({
            db,
            gestaltGraph,
            discovery,
          }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsGestaltTrustByIdentity,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
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
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        gestaltsGestaltTrustByIdentity:
          new GestaltsGestaltTrustByIdentityHandler({
            db,
            gestaltGraph,
            discovery,
          }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsGestaltTrustByIdentity,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const request = {
      providerId: testProvider.id,
      identityId: connectedIdentity,
    };
    // Should fail on first attempt - need to allow time for the identity to be
    // linked to a node via discovery
    await testUtils.expectRemoteError(
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
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        gestaltsGestaltTrustByIdentity:
          new GestaltsGestaltTrustByIdentityHandler({
            db,
            gestaltGraph,
            discovery,
          }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsGestaltTrustByIdentity,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    testProvider.users['disconnected-user'] = {};
    const request = {
      providerId: testProvider.id,
      identityId: connectedIdentity,
    };
    // Should fail on first attempt - attempt to find a connected node
    await testUtils.expectRemoteError(
      rpcClient.methods.gestaltsGestaltTrustByIdentity(request),
      gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
    );
    // Wait and try again - should fail again because the identity has no
    // linked nodes we can trust
    await testUtils.expectRemoteError(
      rpcClient.methods.gestaltsGestaltTrustByIdentity(request),
      gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
    );
  });
  test('trust extends to entire gestalt', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        gestaltsGestaltTrustByIdentity:
          new GestaltsGestaltTrustByIdentityHandler({
            db,
            gestaltGraph,
            discovery,
          }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsGestaltTrustByIdentity,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
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
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        gestaltsGestaltTrustByIdentity:
          new GestaltsGestaltTrustByIdentityHandler({
            db,
            gestaltGraph,
            discovery,
          }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsGestaltTrustByIdentity,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    await gestaltGraph.setNode({
      nodeId: keyRing.getNodeId(),
    });
    const request = {
      providerId: testProvider.id,
      identityId: connectedIdentity,
    };
    // Should fail on first attempt - need to allow time for the identity to be
    // linked to a node via discovery
    await testUtils.expectRemoteError(
      rpcClient.methods.gestaltsGestaltTrustByIdentity(request),
      gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
    );
    // Wait and try again - should succeed second time
    await sleep(2000);
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
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);
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
      host: node.agentServiceHost as Host,
      port: node.agentServicePort as Port,
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
    await clientService?.stop({ force: true });
    await webSocketClient.destroy(true);
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
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        gestaltsGestaltTrustByNode: new GestaltsGestaltTrustByNodeHandler({
          db,
          gestaltGraph,
          discovery,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsGestaltTrustByNode,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
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
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        gestaltsGestaltTrustByNode: new GestaltsGestaltTrustByNodeHandler({
          db,
          gestaltGraph,
          discovery,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsGestaltTrustByNode,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
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
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        gestaltsGestaltTrustByNode: new GestaltsGestaltTrustByNodeHandler({
          db,
          gestaltGraph,
          discovery,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsGestaltTrustByNode,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
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
