import type { TLSConfig } from '@/network/types';
import type { ClaimLinkIdentity } from '@/claims/payloads/index';
import type {
  ClaimIdEncoded,
  IdentityId,
  ProviderId,
  ProviderIdentityClaimId,
} from '@/ids/index';
import type { GestaltIdentityInfo, GestaltNodeInfo } from '@/gestalts/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/RPC/RPCServer';
import TaskManager from '@/tasks/TaskManager';
import {
  gestaltsActionsGetByIdentity,
  GestaltsActionsGetByIdentityHandler,
} from '@/client/handlers/gestaltsActionsGetByIdentity';
import {
  gestaltsActionsSetByIdentity,
  GestaltsActionsSetByIdentityHandler,
} from '@/client/handlers/gestaltsActionsSetByIdentity';
import {
  gestaltsActionsUnsetByIdentity,
  GestaltsActionsUnsetByIdentityHandler,
} from '@/client/handlers/gestaltsActionsUnsetByIdentity';
import RPCClient from '@/RPC/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import GestaltGraph from '@/gestalts/GestaltGraph';
import ACL from '@/acl/ACL';
import * as nodesUtils from '@/nodes/utils';
import { encodeProviderIdentityId } from '@/ids/index';
import Token from '@/tokens/Token';
import * as testsUtils from '../../utils';

describe('gestaltsActionsByIdentity', () => {
  const logger = new Logger('agentUnlock test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const host = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let taskManager: TaskManager;
  let webSocketClient: WebSocketClient;
  let webSocketServer: WebSocketServer;
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
    await webSocketServer.stop(true);
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
    const rpcServer = await RPCServer.createRPCServer({
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
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) =>
        rpcServer.handleStream(streamPair, connectionInfo),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsActionsGetByIdentity,
        gestaltsActionsSetByIdentity,
        gestaltsActionsUnsetByIdentity,
      },
      streamFactory: async () => webSocketClient.startConnection(),
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
    const getSetResponse = await rpcClient.methods.gestaltsActionsGetByIdentity(
      providerMessage,
    );
    expect(getSetResponse.actionsList).toContainEqual(action);
    // Unset permission
    await rpcClient.methods.gestaltsActionsUnsetByIdentity(setActionMessage);
    // Check permission was removed
    const getUnsetResponse =
      await rpcClient.methods.gestaltsActionsGetByIdentity(providerMessage);
    expect(getUnsetResponse.actionsList).toHaveLength(0);
  });
});
