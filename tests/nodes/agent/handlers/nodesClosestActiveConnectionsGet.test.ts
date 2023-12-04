import type { Host, Port } from '@/network/types';
import type { Timer } from '@matrixai/timer';
import type KeyRing from '@/keys/KeyRing';
import type { NodeId, NodeIdString } from '@/ids';
import type { AgentServerManifest } from '@/nodes/agent/handlers';
import type { NodeConnection } from '@/nodes';
import type { ActiveConnectionDataMessage } from '@/nodes/agent/types';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as keysUtils from '@/keys/utils';
import NodesClosestActiveConnectionsGet from '@/nodes/agent/handlers/NodesClosestActiveConnectionsGet';
import * as nodesUtils from '@/nodes/utils';
import * as testsUtils from '../../../utils';
import NodeConnectionManager from '../../../../src/nodes/NodeConnectionManager';

describe('nodesClosestLocalNode', () => {
  const logger = new Logger('nodesClosestLocalNode test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const localHost = '127.0.0.1' as Host;
  const timeoutTime = 300;

  let nodeIdLocal: NodeId;
  let keyRingDummyLocal: KeyRing;
  let nodeConnectionManagerLocal: NodeConnectionManager;

  let nodeIdPeer1: NodeId;
  let keyRingDummyPeer1: KeyRing;
  let nodeConnectionManagerPeer1: NodeConnectionManager;
  let portPeer1: Port;

  beforeEach(async () => {
    const keyPairLocal = keysUtils.generateKeyPair();
    nodeIdLocal = keysUtils.publicKeyToNodeId(keyPairLocal.publicKey);
    const tlsConfigLocal = await testsUtils.createTLSConfig(keyPairLocal);
    keyRingDummyLocal = {
      getNodeId: () => nodeIdLocal,
      keyPair: keyPairLocal,
    } as KeyRing;
    nodeConnectionManagerLocal = new NodeConnectionManager({
      keyRing: keyRingDummyLocal,
      logger: logger.getChild(`${NodeConnectionManager.name}Local`),
      tlsConfig: tlsConfigLocal,
      connectionIdleTimeoutTimeMin: 1000,
      connectionIdleTimeoutTimeScale: 0,
      connectionConnectTimeoutTime: timeoutTime,
    });

    const keyPairPeer1 = keysUtils.generateKeyPair();
    nodeIdPeer1 = keysUtils.publicKeyToNodeId(keyPairPeer1.publicKey);
    const tlsConfigPeer1 = await testsUtils.createTLSConfig(keyPairPeer1);
    keyRingDummyPeer1 = {
      getNodeId: () => nodeIdPeer1,
      keyPair: keyPairPeer1,
    } as KeyRing;
    nodeConnectionManagerPeer1 = new NodeConnectionManager({
      keyRing: keyRingDummyPeer1,
      logger: logger.getChild(`${NodeConnectionManager.name}Peer1`),
      tlsConfig: tlsConfigPeer1,
      connectionConnectTimeoutTime: timeoutTime,
    });

    await Promise.all([
      nodeConnectionManagerLocal.start({
        agentService: {} as AgentServerManifest,
        host: localHost,
      }),
      nodeConnectionManagerPeer1.start({
        agentService: {
          nodesClosestActiveConnectionsGet:
            new NodesClosestActiveConnectionsGet({
              nodeConnectionManager: nodeConnectionManagerPeer1,
            }),
        } as AgentServerManifest,
        host: localHost,
      }),
    ]);
    portPeer1 = nodeConnectionManagerPeer1.port;
  });
  afterEach(async () => {
    await nodeConnectionManagerLocal.stop({ force: true });
    await nodeConnectionManagerPeer1.stop({ force: true });
  });

  test('should get closest active nodes', async () => {
    // Need to mock sone nodes
    const connection = await nodeConnectionManagerLocal.createConnection(
      [nodeIdPeer1],
      localHost,
      portPeer1,
    );

    // Let's add some fake data.
    // @ts-ignore: kidnap protected property
    const existingConnections = nodeConnectionManagerPeer1.connections;
    const dummyConnections: Map<
      NodeIdString,
      {
        activeConnection: string;
        connections: Record<
          string,
          {
            connection: NodeConnection;
            timer: Timer | null;
            usageCount: number;
          }
        >;
      }
    > = new Map();
    // @ts-ignore: replace existing connections with dummy
    nodeConnectionManagerPeer1.connections = dummyConnections;

    const targetNodeId = testsUtils.generateRandomNodeId();
    // Create some Ids in order of furthest first.
    const dummyNodeIds: Array<NodeId> = [];
    for (let i = 255; i >= 0; i -= 5) {
      const nodeId = nodesUtils.generateRandomNodeIdForBucket(targetNodeId, i);
      dummyNodeIds.unshift(nodeId);
      const nodeIdString = nodeId.toString() as NodeIdString;
      const connectionId = `connectionId-${i}`;
      const entry = {
        activeConnection: connectionId,
        connections: {
          [connectionId]: {
            connection: {
              connectionId,
              host: localHost,
              port: i,
              destroy: () => {},
            } as NodeConnection,
            timer: null,
            usageCount: 0,
          },
        },
      };
      dummyConnections.set(nodeIdString, entry);
    }

    const resultStream =
      await connection.rpcClient.methods.nodesClosestActiveConnectionsGet({
        nodeIdEncoded: nodesUtils.encodeNodeId(targetNodeId),
      });
    const results: Array<ActiveConnectionDataMessage> = [];
    for await (const result of resultStream) {
      results.push(result);
    }

    // @ts-ignore: restore existing connections
    nodeConnectionManagerPeer1.connections = existingConnections;

    expect(results).toHaveLength(20);
    // Nodes should be in order of closest first
    for (let i = 0; i < results.length; i++) {
      expect(results[i].nodeId).toBe(nodesUtils.encodeNodeId(dummyNodeIds[i]));
    }
  });
});
