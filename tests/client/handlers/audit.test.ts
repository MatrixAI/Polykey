import type { ConnectionData, Host, Port, TLSConfig } from '@/network/types';
import type { OverrideRPClientType } from '@/client/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { RPCClient } from '@matrixai/rpc';
import { WebSocketClient } from '@matrixai/ws';
import KeyRing from '@/keys/KeyRing';
import ClientService from '@/client/ClientService';
import { auditEventsGet } from '@/client/callers';
import * as keysUtils from '@/keys/utils';
import * as nodesUtils from '@/nodes/utils';
import * as nodesEvents from '@/nodes/events';
import * as networkUtils from '@/network/utils';
import AuditEventsGet from '@/client/handlers/AuditEventsGet';
import { Audit } from '@/audit';
import AuditMetricGet from '@/client/handlers/AuditMetricGet';
import auditMetricGet from '@/client/callers/auditMetricGet';
import * as testNodesUtils from '../../nodes/utils';
import * as testsUtils from '../../utils';

describe('auditEventGet', () => {
  const logger = new Logger('auditEventsGet test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'password';
  const localhost = '127.0.0.1';
  let audit: Audit;
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: OverrideRPClientType<
    RPCClient<{
      auditEventsGet: typeof auditEventsGet;
    }>
  >;
  let tlsConfig: TLSConfig;

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
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    audit = await Audit.createAudit({
      db,
      nodeConnectionManager: new EventTarget() as any,
      logger: logger.getChild(Audit.name),
    });
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        auditEventsGet: new AuditEventsGet({
          audit,
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
        auditEventsGet,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    }) as any;
  });
  afterEach(async () => {
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await keyRing.stop();
    await audit.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('cancels', async () => {
    const callerInterface = await rpcClient.methods.auditEventsGet({
      path: [],
    });
    const reader = callerInterface.getReader();
    await reader.cancel();
    await expect(reader.closed).toResolve();
  });
  test('gets connection events', async () => {
    const nodeId = testNodesUtils.generateRandomNodeId();
    const eventDetail: ConnectionData = {
      remoteHost: '::' as Host,
      remoteNodeId: nodeId,
      remotePort: 0 as Port,
    };
    const auditEventData = {
      ...eventDetail,
      remoteNodeId: nodesUtils.encodeNodeId(eventDetail.remoteNodeId),
    };
    // @ts-ignore: kidnap protected
    const handlerMap = audit.eventHandlerMap;
    await handlerMap
      .get(nodesEvents.EventNodeConnectionManagerConnectionReverse)
      ?.handler(
        new nodesEvents.EventNodeConnectionManagerConnectionReverse({
          detail: eventDetail,
        }),
      );
    const callerInterface = await rpcClient.methods.auditEventsGet({
      path: ['node', 'connection', 'reverse'],
    });
    const reader = callerInterface.getReader();
    await expect(reader.read().then((e) => e.value!.data)).resolves.toEqual({
      ...auditEventData,
      type: 'reverse',
    });
  });
});

describe('auditMetricGet', () => {
  const logger = new Logger('auditMetricGet test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'password';
  const localhost = '127.0.0.1';
  let audit: Audit;
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: OverrideRPClientType<
    RPCClient<{
      auditEventsGet: typeof auditEventsGet;
    }>
  >;
  let tlsConfig: TLSConfig;

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
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    audit = await Audit.createAudit({
      db,
      nodeConnectionManager: new EventTarget() as any,
      logger: logger.getChild(Audit.name),
    });
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        auditMetricGet: new AuditMetricGet({
          audit,
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
        auditMetricGet,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    }) as any;
  });
  afterEach(async () => {
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await keyRing.stop();
    await audit.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets connection metrics', async () => {
    const nodeId = testNodesUtils.generateRandomNodeId();
    const eventDetail: ConnectionData = {
      remoteHost: '::' as Host,
      remoteNodeId: nodeId,
      remotePort: 0 as Port,
    };
    // @ts-ignore: kidnap protected
    const handlerMap = audit.eventHandlerMap;
    await handlerMap
      .get(nodesEvents.EventNodeConnectionManagerConnectionReverse)
      ?.handler(
        new nodesEvents.EventNodeConnectionManagerConnectionReverse({
          detail: eventDetail,
        }),
      );
    await expect(
      rpcClient.methods
        .auditMetricGet({
          path: ['node', 'connection', 'inbound'],
        })
        .then((e) => e.data),
    ).resolves.toEqual({
      total: 1,
      averagePerMinute: 1,
      averagePerHour: 1,
      averagePerDay: 1,
    });
  });
});
