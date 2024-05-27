import type { ConnectionData, Host, Port, TLSConfig } from '@/network/types';
import type { OverrideRPClientType } from '@/client/types';
import type NodeConnectionManager from '@/nodes/NodeConnectionManager';
import type Discovery from '@/discovery/Discovery';
import type { GestaltIdEncoded } from '@/ids';
import type { POJO } from '@';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { RPCClient } from '@matrixai/rpc';
import { WebSocketClient } from '@matrixai/ws';
import KeyRing from '@/keys/KeyRing';
import ClientService from '@/client/ClientService';
import * as keysUtils from '@/keys/utils';
import * as nodesUtils from '@/nodes/utils';
import * as nodesEvents from '@/nodes/events';
import * as discoveryEvents from '@/discovery/events';
import * as networkUtils from '@/network/utils';
import { Audit } from '@/audit';
import AuditMetricGet from '@/client/handlers/AuditMetricGet';
import AuditEventsGet from '@/client/handlers/AuditEventsGet';
import auditMetricGet from '@/client/callers/auditMetricGet';
import auditEventsGet from '@/client/callers/auditEventsGet';
import * as testsUtils from '../../utils';
import * as testNodesUtils from '../../nodes/utils';

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
  let nodeConnectionManager: NodeConnectionManager; // Event target pretending to be discovery
  let discovery: Discovery; // Event target pretending to be discovery

  const handleEvent = async (evt) => {
    // @ts-ignore: kidnap protected handlerMap so we can send events in the foreground
    const handlerMap = audit.eventHandlerMap;
    await handlerMap.get(evt.constructor)?.handler(evt);
  };

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
    nodeConnectionManager = new EventTarget() as any;
    discovery = new EventTarget() as any;
    audit = await Audit.createAudit({
      db,
      nodeConnectionManager,
      discovery,
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
    let callerInterface = await rpcClient.methods.auditEventsGet({
      paths: [],
    });
    let reader = callerInterface.getReader();
    await reader.cancel();
    await expect(reader.closed).toResolve();
    callerInterface = await rpcClient.methods.auditEventsGet({
      paths: [],
      awaitFutureEvents: true,
    });
    reader = callerInterface.getReader();
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
    await handleEvent(
      new nodesEvents.EventNodeConnectionManagerConnectionReverse({
        detail: eventDetail,
      }),
    );
    let callerInterface: any = await rpcClient.methods.auditEventsGet({
      paths: [['node', 'connection', 'reverse']],
    });
    let reader = callerInterface.getReader();
    await expect(reader.read().then((e) => e.value!.data)).resolves.toEqual({
      ...auditEventData,
      type: 'reverse',
    });
    callerInterface = await rpcClient.methods.auditEventsGet({
      paths: [['node', 'connection']],
      awaitFutureEvents: true,
    });
    reader = callerInterface.getReader();
    await expect(reader.read().then((e) => e.value!.data)).resolves.toEqual({
      ...auditEventData,
      type: 'reverse',
    });
    await handleEvent(
      new nodesEvents.EventNodeConnectionManagerConnectionForward({
        detail: eventDetail,
      }),
    );
    await expect(reader.read().then((e) => e.value!.data)).resolves.toEqual({
      ...auditEventData,
      type: 'forward',
    });
  });
  test('gets discovery events', async () => {
    // Set up some events
    await handleEvent(
      new discoveryEvents.EventDiscoveryVertexQueued({
        detail: {
          vertex: 'vertex1' as GestaltIdEncoded,
        },
      }),
    );
    await handleEvent(
      new discoveryEvents.EventDiscoveryVertexQueued({
        detail: {
          vertex: 'vertex2' as GestaltIdEncoded,
          parent: 'vertex1' as GestaltIdEncoded,
        },
      }),
    );
    await handleEvent(
      new discoveryEvents.EventDiscoveryVertexQueued({
        detail: {
          vertex: 'vertex3' as GestaltIdEncoded,
          parent: 'vertex1' as GestaltIdEncoded,
        },
      }),
    );
    await handleEvent(
      new discoveryEvents.EventDiscoveryVertexProcessed({
        detail: {
          vertex: 'vertex1' as GestaltIdEncoded,
        },
      }),
    );
    await handleEvent(
      new discoveryEvents.EventDiscoveryVertexFailed({
        detail: {
          vertex: 'vertex2' as GestaltIdEncoded,
          parent: 'vertex1' as GestaltIdEncoded,
          code: 255,
          message: 'some message',
        },
      }),
    );
    await handleEvent(
      new discoveryEvents.EventDiscoveryVertexCancelled({
        detail: {
          vertex: 'vertex3' as GestaltIdEncoded,
          parent: 'vertex1' as GestaltIdEncoded,
        },
      }),
    );

    const readableStream = await rpcClient.methods.auditEventsGet({
      paths: [['discovery', 'vertex']],
    });
    const results: Array<POJO> = [];
    for await (const result of readableStream) {
      results.push(result);
    }
    expect(results).toHaveLength(6);
  });
  test('can get multiple paths in ascending order', async () => {
    const nodeId = testNodesUtils.generateRandomNodeId();
    const eventDetail: ConnectionData = {
      remoteHost: '::' as Host,
      remoteNodeId: nodeId,
      remotePort: 0 as Port,
    };
    await handleEvent(
      new nodesEvents.EventNodeConnectionManagerConnectionReverse({
        detail: {
          ...eventDetail,
          remotePort: 1 as Port,
        },
      }),
    );
    await handleEvent(
      new nodesEvents.EventNodeConnectionManagerConnectionForward({
        detail: {
          ...eventDetail,
          remotePort: 2 as Port,
        },
      }),
    );
    await handleEvent(
      new nodesEvents.EventNodeConnectionManagerConnectionReverse({
        detail: {
          ...eventDetail,
          remotePort: 3 as Port,
        },
      }),
    );
    await handleEvent(
      new nodesEvents.EventNodeConnectionManagerConnectionForward({
        detail: {
          ...eventDetail,
          remotePort: 4 as Port,
        },
      }),
    );
    const callerInterface: any = await rpcClient.methods.auditEventsGet({
      paths: [
        ['node', 'connection'],
        ['node', 'connection', 'forward'],
      ],
      order: 'asc',
    });
    const order: Array<number> = [];
    const pathSet: Set<string> = new Set();
    for await (const result of callerInterface) {
      order.push(result.data.remotePort);
      pathSet.add(result.path.join('.'));
    }
    expect(order).toMatchObject([1, 2, 3, 4]);
    expect([...pathSet]).toIncludeAllMembers([
      'node.connection.reverse',
      'node.connection.forward',
    ]);
    expect(pathSet.size).toBe(2);
  });
  test('can get multiple paths in descending order', async () => {
    const nodeId = testNodesUtils.generateRandomNodeId();
    const eventDetail: ConnectionData = {
      remoteHost: '::' as Host,
      remoteNodeId: nodeId,
      remotePort: 0 as Port,
    };
    await handleEvent(
      new nodesEvents.EventNodeConnectionManagerConnectionReverse({
        detail: {
          ...eventDetail,
          remotePort: 1 as Port,
        },
      }),
    );
    await handleEvent(
      new nodesEvents.EventNodeConnectionManagerConnectionForward({
        detail: {
          ...eventDetail,
          remotePort: 2 as Port,
        },
      }),
    );
    await handleEvent(
      new nodesEvents.EventNodeConnectionManagerConnectionReverse({
        detail: {
          ...eventDetail,
          remotePort: 3 as Port,
        },
      }),
    );
    await handleEvent(
      new nodesEvents.EventNodeConnectionManagerConnectionForward({
        detail: {
          ...eventDetail,
          remotePort: 4 as Port,
        },
      }),
    );
    const callerInterface: any = await rpcClient.methods.auditEventsGet({
      paths: [
        ['node', 'connection'],
        ['node', 'connection', 'forward'],
      ],
      order: 'desc',
    });
    const order: Array<number> = [];
    const pathSet: Set<string> = new Set();
    for await (const result of callerInterface) {
      order.push(result.data.remotePort);
      pathSet.add(result.path.join('.'));
    }
    expect(order).toMatchObject([4, 3, 2, 1]);
    expect([...pathSet]).toIncludeAllMembers([
      'node.connection.reverse',
      'node.connection.forward',
    ]);
    expect(pathSet.size).toBe(2);
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
  let nodeConnectionManager: NodeConnectionManager; // Event target pretending to be discovery
  let discovery: Discovery; // Event target pretending to be discovery

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
    nodeConnectionManager = new EventTarget() as any;
    discovery = new EventTarget() as any;
    audit = await Audit.createAudit({
      db,
      nodeConnectionManager,
      discovery,
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
