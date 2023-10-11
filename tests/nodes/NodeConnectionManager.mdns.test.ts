import type { Host, Port, TLSConfig } from '@/network/types';
import type { NodeAddress } from '@/nodes/types';
import type { NodeId, NodeIdEncoded, NodeIdString } from '@/ids';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { DB } from '@matrixai/db';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import KeyRing from '@/keys/KeyRing';
import NodeGraph from '@/nodes/NodeGraph';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import { promise, sleep } from '@/utils';
import * as nodesErrors from '@/nodes/errors';
import NodeConnection from '@/nodes/NodeConnection';
import * as tlsUtils from '../utils/tls';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import { events as mdnsEvents } from '@matrixai/mdns';

describe(`${NodeConnectionManager.name} lifecycle test`, () => {
  const logger = new Logger(`${NodeConnection.name} test`, LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const localHost = '::' as Host;
  const password = 'password';

  let dataDir: string;

  let serverTlsConfig: TLSConfig;
  let clientTlsConfig: TLSConfig;
  let serverNodeId: NodeId;
  let clientNodeId: NodeId;
  let serverNodeIdEncoded: NodeIdEncoded;
  let keyRingPeer: KeyRing;
  let nodeConnectionManagerPeer: NodeConnectionManager;
  let serverAddress: NodeAddress;

  let keyRing: KeyRing;
  let db: DB;
  let nodeGraph: NodeGraph;

  let nodeConnectionManager: NodeConnectionManager;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPathPeer = path.join(dataDir, 'keysPeer');
    keyRingPeer = await KeyRing.createKeyRing({
      password,
      keysPath: keysPathPeer,
      logger,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
    });
    const serverKeyPair = keyRingPeer.keyPair;
    const clientKeyPair = keysUtils.generateKeyPair();
    serverNodeId = keysUtils.publicKeyToNodeId(serverKeyPair.publicKey);
    clientNodeId = keysUtils.publicKeyToNodeId(clientKeyPair.publicKey);
    serverNodeIdEncoded = nodesUtils.encodeNodeId(serverNodeId);
    serverTlsConfig = await tlsUtils.createTLSConfig(serverKeyPair);
    clientTlsConfig = await tlsUtils.createTLSConfig(clientKeyPair);

    nodeConnectionManagerPeer = new NodeConnectionManager({
      keyRing: keyRingPeer,
      logger: logger.getChild(`${NodeConnectionManager.name}Peer`),
      nodeGraph: {} as NodeGraph,
      tlsConfig: serverTlsConfig,
      seedNodes: undefined,
    });
    await nodeConnectionManagerPeer.start({
      host: localHost,
      enableMdns: true
    });

    // Setting up client dependencies
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    serverAddress = {
      host: nodeConnectionManagerPeer.host,
      port: nodeConnectionManagerPeer.port,
      scopes: ['local']
    };
  });

  afterEach(async () => {
    await nodeConnectionManager?.stop();
    await nodeGraph.stop();
    await nodeGraph.destroy();
    await db.stop();
    await db.destroy();
    await keyRing.stop();
    await keyRing.destroy();

    await nodeConnectionManagerPeer.stop();
  });

  test('finds node (contacts remote node)', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      nodeGraph,
      options: {
        connectionConnectTimeoutTime: 1000,
      },
      logger: logger.getChild(`${NodeConnectionManager.name}Local`),
      tlsConfig: clientTlsConfig,
      seedNodes: undefined,
    });

    const serviceProm = promise();
    // @ts-ignore: protected property
    nodeConnectionManager.mdns.addEventListener(mdnsEvents.EventMDNSService.name, (evt: mdnsEvents.EventMDNSService) => {
      if (evt.detail.name === serverNodeIdEncoded) {
        serviceProm.resolveP();
      }
    });

    await nodeConnectionManager.start({
      host: localHost,
      enableMdns: true
    });

    // Mocking pinging to always return true
    const mockedPingNode = jest.spyOn(
      NodeConnectionManager.prototype,
      'pingNode',
    );
    mockedPingNode.mockImplementation(
      () => new PromiseCancellable((resolve) => resolve(true)),
    );
    logger.info('DOING TEST');

    await serviceProm.p;

    // Expect no error thrown
    const foundAddresses = nodeConnectionManager.findNodeLocal(serverNodeId);

    expect(foundAddresses).toBeArray();
    expect(foundAddresses).toIncludeAllPartialMembers([{ port: nodeConnectionManagerPeer.port, scopes: ['local'] }])

    await nodeConnectionManager.stop();
  });
  test('withConnF should create connection', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      tlsConfig: clientTlsConfig,
      seedNodes: undefined,
    });

    const serviceProm = promise();
    // @ts-ignore: protected property
    nodeConnectionManager.mdns.addEventListener(mdnsEvents.EventMDNSService.name, (evt: mdnsEvents.EventMDNSService) => {
      if (evt.detail.name === serverNodeIdEncoded) {
        serviceProm.resolveP();
      }
    });

    // TODO: ipv6 only connection still fails
    // currently, it only succeeds when it finds the ipv4Mappedipv6 address
    await nodeConnectionManager.start({
      host: localHost,
      enableMdns: true
    });

    await serviceProm.p;

    await nodeConnectionManager.withConnF(serverNodeId, async () => {
      expect(nodeConnectionManager.hasConnection(serverNodeId)).toBeTrue();
    });

    // @ts-ignore: Kidnap protected property
    const connectionMap = nodeConnectionManager.connections;
    const connection = connectionMap.get(
      serverNodeId.toString() as NodeIdString,
    );
    await connection!.connection.destroy({ force: true });

    await nodeConnectionManager.stop();
  });
});
