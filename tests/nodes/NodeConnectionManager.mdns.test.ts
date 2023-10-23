import type { Host, TLSConfig } from '@/network/types';
import type { NodeId, NodeIdEncoded } from '@/ids';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { DB } from '@matrixai/db';
import { MDNS, events as mdnsEvents } from '@matrixai/mdns';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import KeyRing from '@/keys/KeyRing';
import NodeGraph from '@/nodes/NodeGraph';
import NodeConnection from '@/nodes/NodeConnection';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils';
import { promise } from '@/utils';
import config  from '@/config';
import * as tlsUtils from '../utils/tls';

describe(`${NodeConnectionManager.name} MDNS test`, () => {
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
  let clientNodeIdEncoded: NodeIdEncoded;
  let keyRingPeer: KeyRing;
  let mdnsPeer: MDNS;
  let nodeConnectionManagerPeer: NodeConnectionManager;

  let keyRing: KeyRing;
  let db: DB;
  let nodeGraph: NodeGraph;

  let mdns: MDNS;
  let nodeConnectionManager: NodeConnectionManager;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPathPeer = path.join(dataDir, 'keysPeer');
    keyRingPeer = await KeyRing.createKeyRing({
      password,
      keysPath: keysPathPeer,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
    });
    const serverKeyPair = keyRingPeer.keyPair;
    const clientKeyPair = keysUtils.generateKeyPair();
    serverNodeId = keysUtils.publicKeyToNodeId(serverKeyPair.publicKey);
    clientNodeId = keysUtils.publicKeyToNodeId(clientKeyPair.publicKey);
    serverNodeIdEncoded = nodesUtils.encodeNodeId(serverNodeId);
    clientNodeIdEncoded = nodesUtils.encodeNodeId(clientNodeId);
    serverTlsConfig = await tlsUtils.createTLSConfig(serverKeyPair);
    clientTlsConfig = await tlsUtils.createTLSConfig(clientKeyPair);

    mdnsPeer = new MDNS({
      logger: logger.getChild(`${MDNS.name}Peer`),
    });
    await mdnsPeer.start({
      id: serverNodeId.at(0),
      hostname: serverNodeIdEncoded,
      groups: config.defaultsSystem.mdnsGroups,
      // This is different so that we do not conflict with the MDNS stack on other Polykey agents when running these tests
      port: 64022,
    });
    nodeConnectionManagerPeer = new NodeConnectionManager({
      keyRing: keyRingPeer,
      logger: logger.getChild(`${NodeConnectionManager.name}Peer`),
      nodeGraph: {} as NodeGraph,
      tlsConfig: serverTlsConfig,
      seedNodes: undefined,
      mdns: mdnsPeer
    });
    await nodeConnectionManagerPeer.start({
      host: localHost,
    });

    // Setting up client dependencies
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
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
    mdns = new MDNS({
      logger: logger.getChild(MDNS.name),
    });
    await mdns.start({
      id: clientNodeId.at(0),
      hostname: clientNodeIdEncoded,
      groups: config.defaultsSystem.mdnsGroups,
      // This is different so that we do not conflict with the MDNS stack on other Polykey agents when running these tests
      port: 64022,
    });
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

  test('should find local node without seedNodes', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      nodeGraph,
      mdns,
      logger: logger.getChild(`${NodeConnectionManager.name}Local`),
      tlsConfig: clientTlsConfig,
      seedNodes: undefined,
    });

    await nodeConnectionManager.start({
      host: localHost,
    });

    // Expect no error thrown
    const foundAddresses = await nodeConnectionManager.findNodeLocal(serverNodeId);

    expect(foundAddresses).toBeArray();
    expect(foundAddresses).toIncludeAllPartialMembers([{ port: nodeConnectionManagerPeer.port, scopes: ['local'] }])

    await nodeConnectionManager.stop();
  });
  test('acquireConnection should create local connection without seednodes', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      nodeGraph,
      mdns,
      logger: logger.getChild(`${NodeConnectionManager.name}Local`),
      tlsConfig: clientTlsConfig,
      seedNodes: undefined,
      connectionConnectTimeoutTime: 1000,
    });

    await nodeConnectionManager.start({
      host: localHost,
    });

    const acquire =
      await nodeConnectionManager.acquireConnection(serverNodeId);
    const [release] = await acquire();
    expect(nodeConnectionManager.hasConnection(serverNodeId)).toBeTrue();
    await release();
    await nodeConnectionManager.stop();
  });
});
