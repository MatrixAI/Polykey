import type { Host, Port } from '@/network/types';
import type { AgentServerManifest } from '@/nodes/agent/handlers';
import type { NodeId } from '@/ids';
import type { KeyRing } from '@/keys';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { Timer } from '@matrixai/timer';
import { destroyed } from '@matrixai/async-init';
import * as keysUtils from '@/keys/utils';
import * as nodesEvents from '@/nodes/events';
import * as nodesErrors from '@/nodes/errors';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodesConnectionSignalFinal from '@/nodes/agent/handlers/NodesConnectionSignalFinal';
import NodesConnectionSignalInitial from '@/nodes/agent/handlers/NodesConnectionSignalInitial';
import * as nodesUtils from '@/nodes/utils';
import * as testsUtils from '../utils';

describe(`NodeConnectionManager`, () => {
  const logger = new Logger(
    `${NodeConnectionManager.name} test`,
    LogLevel.WARN,
    [
      new StreamHandler(
        formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
      ),
    ],
  );
  const localHost = '127.0.0.1' as Host;
  const dummyManifest = {} as AgentServerManifest;
  const timeoutTime = 300;

  test('NodeConnectionManager readiness', async () => {
    const keyPair = keysUtils.generateKeyPair();
    const nodeId = keysUtils.publicKeyToNodeId(keyPair.publicKey);
    const tlsConfig = await testsUtils.createTLSConfig(keyPair);
    const dummyKeyRing = {
      getNodeId: () => nodeId,
      keyPair,
    } as KeyRing;
    const nodeConnectionManager = new NodeConnectionManager({
      keyRing: dummyKeyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      tlsConfig: tlsConfig,
    });
    await nodeConnectionManager.start({
      agentService: dummyManifest,
      host: localHost,
    });

    await nodeConnectionManager.stop();
  });
  test('NodeConnectionManager consecutive start stops', async () => {
    const keyPair = keysUtils.generateKeyPair();
    const nodeId = keysUtils.publicKeyToNodeId(keyPair.publicKey);
    const tlsConfig = await testsUtils.createTLSConfig(keyPair);
    const dummyKeyRing = {
      getNodeId: () => nodeId,
      keyPair,
    } as KeyRing;
    const nodeConnectionManager = new NodeConnectionManager({
      keyRing: dummyKeyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      tlsConfig: tlsConfig,
    });
    await nodeConnectionManager.start({
      agentService: {} as AgentServerManifest,
      host: localHost as Host,
    });
    await nodeConnectionManager.stop();
    await nodeConnectionManager.start({
      agentService: {} as AgentServerManifest,
      host: localHost as Host,
    });
    await nodeConnectionManager.stop();
  });

  // With constructed NCM and 1 peer
  describe('With 1 peer', () => {
    let nodeIdLocal: NodeId;
    let keyRingDummyLocal: KeyRing;
    let nodeConnectionManagerLocal: NodeConnectionManager;
    let portLocal: Port;

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
        connectionIdleTimeoutTime: 1000,
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
          agentService: dummyManifest,
          host: localHost,
        }),
        nodeConnectionManagerPeer1.start({
          agentService: dummyManifest,
          host: localHost,
        }),
      ]);
      portLocal = nodeConnectionManagerLocal.port;
      portPeer1 = nodeConnectionManagerPeer1.port;
    });
    afterEach(async () => {
      await nodeConnectionManagerLocal.stop({ force: true });
      await nodeConnectionManagerPeer1.stop({ force: true });
    });

    test('can create a connection', async () => {
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      // Should exist in the map now.
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeTrue();
    });
    test('connection creation can time out', async () => {
      await expect(
        nodeConnectionManagerLocal.createConnection(
          [nodeIdPeer1],
          localHost,
          56666 as Port,
        ),
      ).rejects.toThrow(nodesErrors.ErrorNodeConnectionTimeout);
    });
    test('connection creation can time out with time', async () => {
      await expect(
        nodeConnectionManagerLocal.createConnection(
          [nodeIdPeer1],
          localHost,
          56666 as Port,
          { timer: 100 },
        ),
      ).rejects.toThrow(nodesErrors.ErrorNodeConnectionTimeout);
    });
    test('connection creation can time out with Timer', async () => {
      await expect(
        nodeConnectionManagerLocal.createConnection(
          [nodeIdPeer1],
          localHost,
          56666 as Port,
          { timer: new Timer({ delay: 100 }) },
        ),
      ).rejects.toThrow(nodesErrors.ErrorNodeConnectionTimeout);
    });
    test('connection can be destroyed', async () => {
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      // Should exist in the map now.
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeTrue();
      await nodeConnectionManagerLocal.destroyConnection(nodeIdPeer1, true);
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeFalse();
    });
    test('a node can have multiple connections', async () => {
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeTrue();
      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(1);
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeTrue();
      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(2);
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeTrue();
      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(3);
    });
    test('specific connection for a node can be destroyed', async () => {
      const connection1 = await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      const connection2 = await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      const connection3 = await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(3);
      await nodeConnectionManagerLocal.destroyConnection(
        nodeIdPeer1,
        true,
        connection2.connectionId,
      );
      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(2);
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeTrue();
      await nodeConnectionManagerLocal.destroyConnection(
        nodeIdPeer1,
        true,
        connection1.connectionId,
      );
      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(1);
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeTrue();
      await nodeConnectionManagerLocal.destroyConnection(
        nodeIdPeer1,
        true,
        connection3.connectionId,
      );
      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(0);
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeFalse();
    });
    test('all connections for a node can be destroyed', async () => {
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(3);
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeTrue();
      await nodeConnectionManagerLocal.destroyConnection(nodeIdPeer1, true);
      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(0);
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeFalse();
    });
    test('connection is removed from map when connection ends', async () => {
      const connectionPeerCreated = testsUtils.promFromEvent(
        nodeConnectionManagerPeer1,
        nodesEvents.EventNodeConnectionManagerConnection,
      );
      const connectionPeerDestroyed = testsUtils.promFromEvent(
        nodeConnectionManagerPeer1,
        nodesEvents.EventNodeConnectionDestroyed,
      );

      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeTrue();
      // Allow time for peer connection to be created
      await connectionPeerCreated;
      const connectionPeer =
        nodeConnectionManagerPeer1.getConnection(nodeIdLocal)!;
      expect(connectionPeer).toBeDefined();
      // Trigger destruction of peer connection
      await connectionPeer.connection.destroy({ force: true });
      // Allow time for connection to end
      await connectionPeerDestroyed;
      // Connections should be removed from map
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeFalse();
      expect(nodeConnectionManagerPeer1.hasConnection(nodeIdLocal)).toBeFalse();
    });
    test('established connections can be used', async () => {
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      const connectionAndTimer =
        nodeConnectionManagerLocal.getConnection(nodeIdPeer1);
      await nodeConnectionManagerLocal.withConnF(nodeIdPeer1, async () => {
        expect(connectionAndTimer?.usageCount).toBe(1);
        expect(connectionAndTimer?.timer).toBeNull();
      });
      expect(connectionAndTimer?.usageCount).toBe(0);
      expect(connectionAndTimer?.timer).toBeDefined();
    });
    test('only the lowest connectionId connection is used', async () => {
      const connectionsPeerP = testsUtils.promFromEvents(
        nodeConnectionManagerPeer1,
        nodesEvents.EventNodeConnectionManagerConnection,
        4,
      );
      const connectionIdPs = [1, 2, 3, 4].map(async () => {
        const connection = await nodeConnectionManagerLocal.createConnection(
          [nodeIdPeer1],
          localHost,
          portPeer1,
        );
        return connection.connectionId;
      });
      const connectionIds = await Promise.all(connectionIdPs);
      connectionIds.sort();

      await nodeConnectionManagerLocal.withConnF(
        nodeIdPeer1,
        async (connection) => {
          expect(connection.connectionId).toBe(connectionIds[0]);
        },
      );

      await connectionsPeerP;

      // Lowest connection is deterministically the same for the peer too
      await nodeConnectionManagerPeer1.withConnF(
        nodeIdLocal,
        async (connection) => {
          expect(connection.connectionId).toBe(connectionIds[0]);
        },
      );
    });
    test('when a connection is destroyed, the next lowest takes its place', async () => {
      const connectionIdPs = [1, 2, 3, 4].map(async () => {
        const connection = await nodeConnectionManagerLocal.createConnection(
          [nodeIdPeer1],
          localHost,
          portPeer1,
        );
        return connection.connectionId;
      });
      const connectionIds = await Promise.all(connectionIdPs);
      connectionIds.sort();
      for (const connectionId of connectionIds) {
        await nodeConnectionManagerLocal.withConnF(
          nodeIdPeer1,
          async (connection) => {
            // Should always be the lowest alive connectionId
            expect(connection.connectionId).toBe(connectionId);
          },
        );
        await nodeConnectionManagerLocal.destroyConnection(
          nodeIdPeer1,
          true,
          connectionId,
        );
      }
    });
    test('throws when connection is missing', async () => {
      // TODO: check actual error thrown
      await expect(
        nodeConnectionManagerLocal.withConnF(nodeIdPeer1, async () => {}),
      ).rejects.toThrow();
    });
    test('can handle concurrent connections between local and peer', async () => {
      const connectionsLocalP = testsUtils.promFromEvents(
        nodeConnectionManagerLocal,
        nodesEvents.EventNodeConnectionManagerConnection,
        2,
      );
      const connectionsPeer1P = testsUtils.promFromEvents(
        nodeConnectionManagerPeer1,
        nodesEvents.EventNodeConnectionManagerConnection,
        2,
      );
      await Promise.all([
        connectionsLocalP,
        connectionsPeer1P,
        nodeConnectionManagerLocal.createConnection(
          [nodeIdPeer1],
          localHost,
          portPeer1,
        ),
        nodeConnectionManagerPeer1.createConnection(
          [nodeIdLocal],
          localHost,
          portLocal,
        ),
      ]);

      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(2);
      expect(nodeConnectionManagerPeer1.connectionsActive()).toBe(2);
    });
    test('can handle multiple concurrent connections between local and peer', async () => {
      const connectionsLocalP = testsUtils.promFromEvents(
        nodeConnectionManagerLocal,
        nodesEvents.EventNodeConnectionManagerConnection,
        6,
      );
      const connectionsPeer1P = testsUtils.promFromEvents(
        nodeConnectionManagerPeer1,
        nodesEvents.EventNodeConnectionManagerConnection,
        6,
      );
      await Promise.all([
        connectionsLocalP,
        connectionsPeer1P,
        nodeConnectionManagerLocal.createConnection(
          [nodeIdPeer1],
          localHost,
          portPeer1,
        ),
        nodeConnectionManagerLocal.createConnection(
          [nodeIdPeer1],
          localHost,
          portPeer1,
        ),
        nodeConnectionManagerLocal.createConnection(
          [nodeIdPeer1],
          localHost,
          portPeer1,
        ),
        nodeConnectionManagerPeer1.createConnection(
          [nodeIdLocal],
          localHost,
          portLocal,
        ),
        nodeConnectionManagerPeer1.createConnection(
          [nodeIdLocal],
          localHost,
          portLocal,
        ),
        nodeConnectionManagerPeer1.createConnection(
          [nodeIdLocal],
          localHost,
          portLocal,
        ),
      ]);

      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(6);
      expect(nodeConnectionManagerPeer1.connectionsActive()).toBe(6);
    });
    test('connection should timeout after connectionIdleTimeoutTime', async () => {
      // Modify the timeout time value
      const connectionDestroyProm = testsUtils.promFromEvent(
        nodeConnectionManagerLocal,
        nodesEvents.EventNodeConnectionDestroyed,
      );
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      // Wait for timeout.
      const timeStart = Date.now();
      await connectionDestroyProm;
      const duration = Date.now() - timeStart;
      expect(duration).toBeGreaterThan(900);
      expect(duration).toBeLessThan(1500);
    });
    test('non primary connections should timeout with primary in use', async () => {
      // Modify the timeout time value
      const connectionDestroyProm1 = testsUtils.promFromEvents(
        nodeConnectionManagerLocal,
        nodesEvents.EventNodeConnectionDestroyed,
        2,
      );
      const connectionDestroyProm2 = testsUtils.promFromEvents(
        nodeConnectionManagerLocal,
        nodesEvents.EventNodeConnectionDestroyed,
        3,
      );
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      // Wait for timeout.
      await nodeConnectionManagerLocal.withConnF(nodeIdPeer1, async () => {
        expect(nodeConnectionManagerLocal.connectionsActive()).toBe(3);
        await connectionDestroyProm1;
        expect(nodeConnectionManagerLocal.connectionsActive()).toBe(1);
      });
      await connectionDestroyProm2;
      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(0);
    });
    test('can list active connections', async () => {
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );

      const connectionsList = nodeConnectionManagerLocal.listConnections();
      console.log(connectionsList);
      expect(connectionsList).toHaveLength(3);
      for (const connection of connectionsList) {
        expect(connection.address.host).toBe(localHost);
        expect(connection.address.port).toBe(nodeConnectionManagerPeer1.port);
        expect(connection.usageCount).toBe(0);
      }
    });
    test('stopping NodeConnectionManager should destroy all connections', async () => {
      const connection1 = await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      const connection2 = await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      const connection3 = await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );

      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(3);
      expect(connection1[destroyed]).toBeFalse();
      expect(connection2[destroyed]).toBeFalse();
      expect(connection3[destroyed]).toBeFalse();

      await nodeConnectionManagerLocal.stop({ force: true });

      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(0);
      expect(connection1[destroyed]).toBeTrue();
      expect(connection2[destroyed]).toBeTrue();
      expect(connection3[destroyed]).toBeTrue();
    });
  });
  describe('With 2 peers', () => {
    let nodeIdLocal: NodeId;
    let keyRingDummyLocal: KeyRing;
    let nodeConnectionManagerLocal: NodeConnectionManager;
    let portLocal: Port;

    let nodeIdPeer1: NodeId;
    let keyRingDummyPeer1: KeyRing;
    let nodeConnectionManagerPeer1: NodeConnectionManager;
    let portPeer1: Port;

    let nodeIdPeer2: NodeId;
    let keyRingDummyPeer2: KeyRing;
    let nodeConnectionManagerPeer2: NodeConnectionManager;
    let portPeer2: Port;

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

      const keyPairPeer2 = keysUtils.generateKeyPair();
      nodeIdPeer2 = keysUtils.publicKeyToNodeId(keyPairPeer2.publicKey);
      const tlsConfigPeer2 = await testsUtils.createTLSConfig(keyPairPeer2);
      keyRingDummyPeer2 = {
        getNodeId: () => nodeIdPeer2,
        keyPair: keyPairPeer2,
      } as KeyRing;
      nodeConnectionManagerPeer2 = new NodeConnectionManager({
        keyRing: keyRingDummyPeer2,
        logger: logger.getChild(`${NodeConnectionManager.name}Peer2`),
        tlsConfig: tlsConfigPeer2,
        connectionConnectTimeoutTime: timeoutTime,
      });

      await Promise.all([
        nodeConnectionManagerLocal.start({
          agentService: dummyManifest,
          host: localHost,
        }),
        nodeConnectionManagerPeer1.start({
          agentService: {
            nodesConnectionSignalFinal: new NodesConnectionSignalFinal({
              nodeConnectionManager: nodeConnectionManagerPeer1,
              logger,
            }),
            nodesConnectionSignalInitial: new NodesConnectionSignalInitial({
              nodeConnectionManager: nodeConnectionManagerPeer1,
            }),
          } as AgentServerManifest,
          host: localHost,
        }),
        nodeConnectionManagerPeer2.start({
          agentService: {
            nodesConnectionSignalFinal: new NodesConnectionSignalFinal({
              nodeConnectionManager: nodeConnectionManagerPeer2,
              logger,
            }),
            nodesConnectionSignalInitial: new NodesConnectionSignalInitial({
              nodeConnectionManager: nodeConnectionManagerPeer2,
            }),
          } as AgentServerManifest,
          host: localHost,
        }),
      ]);
      portLocal = nodeConnectionManagerLocal.port;
      portPeer1 = nodeConnectionManagerPeer1.port;
      portPeer2 = nodeConnectionManagerPeer2.port;
    });
    afterEach(async () => {
      await nodeConnectionManagerLocal.stop({ force: true });
      await nodeConnectionManagerPeer1.stop({ force: true });
      await nodeConnectionManagerPeer2.stop({ force: true });
    });

    test('can create a connection with signaling', async () => {
      // Create initial connections of local -> peer1 -> peer2
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      await nodeConnectionManagerPeer1.createConnection(
        [nodeIdPeer2],
        localHost,
        portPeer2,
      );

      // Should be able to create connection from local to peer2 using peer1 as signaller
      await nodeConnectionManagerLocal.createConnectionPunch(
        nodeIdPeer2,
        nodeIdPeer1,
      );
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer2)).toBeTrue();
    });
    test('createConnectionPunch fails with no signaler', async () => {
      // Can't signal without signaler connected
      // TODO: check error type
      await expect(
        nodeConnectionManagerLocal.createConnectionPunch(
          nodeIdPeer2,
          nodeIdPeer1,
        ),
      ).rejects.toThrow();
    });
    test('createConnectionPunch fails with signaller missing connection to target', async () => {
      // Create initial connections of local -> peer1
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      // Can't signal without signaler connected
      // TODO: check error type
      await expect(
        nodeConnectionManagerLocal.createConnectionPunch(
          nodeIdPeer2,
          nodeIdPeer1,
        ),
      ).rejects.toThrow();
    });
    test('can create multiple connections with signaling', async () => {
      // Create initial connections of local -> peer1 -> peer2
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
      );
      await nodeConnectionManagerPeer1.createConnection(
        [nodeIdPeer2],
        localHost,
        portPeer2,
      );
      const holePunchSpy = jest.spyOn(nodeConnectionManagerPeer2, 'holePunch');

      // Should be able to create connection from local to peer2 using peer1 as signaller
      await Promise.all([
        nodeConnectionManagerLocal.createConnectionPunch(
          nodeIdPeer2,
          nodeIdPeer1,
        ),
        nodeConnectionManagerLocal.createConnectionPunch(
          nodeIdPeer2,
          nodeIdPeer1,
        ),
        nodeConnectionManagerLocal.createConnectionPunch(
          nodeIdPeer2,
          nodeIdPeer1,
        ),
      ]);
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer2)).toBeTrue();
      // Should have 3 connections + 1 signaller
      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(4);
      // Hole punching was only attempted once
      expect(holePunchSpy).toHaveBeenCalledTimes(1);
    });
  });
});
