import type { Host, Port } from '@/network/types';
import type { AgentServerManifest } from '@/nodes/agent/handlers';
import type { KeyRing } from '@/keys';
import type { NCMState } from './utils';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { Timer } from '@matrixai/timer';
import { destroyed } from '@matrixai/async-init';
import * as keysUtils from '@/keys/utils';
import * as nodesEvents from '@/nodes/events';
import * as nodesErrors from '@/nodes/errors';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodesConnectionSignalFinal from '@/nodes/agent/handlers/NodesConnectionSignalFinal';
import NodesConnectionSignalInitial from '@/nodes/agent/handlers/NodesConnectionSignalInitial';
import * as nodesTestUtils from './utils';
import * as keysTestUtils from '../keys/utils';
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
    let ncmLocal: NCMState;
    let ncmPeer1: NCMState;

    beforeEach(async () => {
      ncmLocal = await nodesTestUtils.nodeConnectionManagerFactory({
        keyRing: keysTestUtils.createDummyKeyRing(),
        createOptions: {
          connectionIdleTimeoutTime: 1000,
          connectionConnectTimeoutTime: timeoutTime,
        },
        startOptions: {
          host: localHost,
          agentService: () => dummyManifest,
        },
        logger: logger.getChild(`${NodeConnectionManager.name}Local`),
      });

      ncmPeer1 = await nodesTestUtils.nodeConnectionManagerFactory({
        keyRing: keysTestUtils.createDummyKeyRing(),
        createOptions: {
          connectionConnectTimeoutTime: timeoutTime,
        },
        startOptions: {
          host: localHost,
          agentService: () => dummyManifest,
        },
        logger: logger.getChild(`${NodeConnectionManager.name}Peer1`),
      });
    });
    afterEach(async () => {
      await ncmLocal.nodeConnectionManager.stop({ force: true });
      await ncmPeer1.nodeConnectionManager.stop({ force: true });
    });

    test('can create a connection', async () => {
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      // Should exist in the map now.
      expect(
        ncmLocal.nodeConnectionManager.hasConnection(ncmPeer1.nodeId),
      ).toBeTrue();
    });
    // FIXME: timeout not respecting `connectionConnectTimeoutTime`.
    test('connection creation can time out', async () => {
      await expect(
        ncmLocal.nodeConnectionManager.createConnection(
          [ncmPeer1.nodeId],
          localHost,
          56666 as Port,
        ),
      ).rejects.toThrow(nodesErrors.ErrorNodeConnectionTimeout);
    });
    test('connection creation can time out with time', async () => {
      await expect(
        ncmLocal.nodeConnectionManager.createConnection(
          [ncmPeer1.nodeId],
          localHost,
          56666 as Port,
          { timer: 100 },
        ),
      ).rejects.toThrow(nodesErrors.ErrorNodeConnectionTimeout);
    });
    test('connection creation can time out with Timer', async () => {
      await expect(
        ncmLocal.nodeConnectionManager.createConnection(
          [ncmPeer1.nodeId],
          localHost,
          56666 as Port,
          { timer: new Timer({ delay: 100 }) },
        ),
      ).rejects.toThrow(nodesErrors.ErrorNodeConnectionTimeout);
    });
    test('connection can be destroyed', async () => {
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      // Should exist in the map now.
      expect(
        ncmLocal.nodeConnectionManager.hasConnection(ncmPeer1.nodeId),
      ).toBeTrue();
      await ncmLocal.nodeConnectionManager.destroyConnection(
        ncmPeer1.nodeId,
        true,
      );
      expect(
        ncmLocal.nodeConnectionManager.hasConnection(ncmPeer1.nodeId),
      ).toBeFalse();
    });
    test('a node can have multiple connections', async () => {
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      expect(
        ncmLocal.nodeConnectionManager.hasConnection(ncmPeer1.nodeId),
      ).toBeTrue();
      expect(ncmLocal.nodeConnectionManager.connectionsActive()).toBe(1);
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      expect(
        ncmLocal.nodeConnectionManager.hasConnection(ncmPeer1.nodeId),
      ).toBeTrue();
      expect(ncmLocal.nodeConnectionManager.connectionsActive()).toBe(2);
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      expect(
        ncmLocal.nodeConnectionManager.hasConnection(ncmPeer1.nodeId),
      ).toBeTrue();
      expect(ncmLocal.nodeConnectionManager.connectionsActive()).toBe(3);
    });
    test('specific connection for a node can be destroyed', async () => {
      const connection1 = await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      const connection2 = await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      const connection3 = await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      expect(ncmLocal.nodeConnectionManager.connectionsActive()).toBe(3);
      await ncmLocal.nodeConnectionManager.destroyConnection(
        ncmPeer1.nodeId,
        true,
        connection2.connectionId,
      );
      expect(ncmLocal.nodeConnectionManager.connectionsActive()).toBe(2);
      expect(
        ncmLocal.nodeConnectionManager.hasConnection(ncmPeer1.nodeId),
      ).toBeTrue();
      await ncmLocal.nodeConnectionManager.destroyConnection(
        ncmPeer1.nodeId,
        true,
        connection1.connectionId,
      );
      expect(ncmLocal.nodeConnectionManager.connectionsActive()).toBe(1);
      expect(
        ncmLocal.nodeConnectionManager.hasConnection(ncmPeer1.nodeId),
      ).toBeTrue();
      await ncmLocal.nodeConnectionManager.destroyConnection(
        ncmPeer1.nodeId,
        true,
        connection3.connectionId,
      );
      expect(ncmLocal.nodeConnectionManager.connectionsActive()).toBe(0);
      expect(
        ncmLocal.nodeConnectionManager.hasConnection(ncmPeer1.nodeId),
      ).toBeFalse();
    });
    test('all connections for a node can be destroyed', async () => {
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      expect(ncmLocal.nodeConnectionManager.connectionsActive()).toBe(3);
      expect(
        ncmLocal.nodeConnectionManager.hasConnection(ncmPeer1.nodeId),
      ).toBeTrue();
      await ncmLocal.nodeConnectionManager.destroyConnection(
        ncmPeer1.nodeId,
        true,
      );
      expect(ncmLocal.nodeConnectionManager.connectionsActive()).toBe(0);
      expect(
        ncmLocal.nodeConnectionManager.hasConnection(ncmPeer1.nodeId),
      ).toBeFalse();
    });
    test('connection is removed from map when connection ends', async () => {
      const connectionPeerCreated = testsUtils.promFromEvent(
        ncmPeer1.nodeConnectionManager,
        nodesEvents.EventNodeConnectionManagerConnection,
      );
      const connectionPeerDestroyed = testsUtils.promFromEvent(
        ncmPeer1.nodeConnectionManager,
        nodesEvents.EventNodeConnectionDestroyed,
      );

      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      expect(
        ncmLocal.nodeConnectionManager.hasConnection(ncmPeer1.nodeId),
      ).toBeTrue();
      // Allow time for peer connection to be created
      await connectionPeerCreated;
      const connectionPeer = ncmPeer1.nodeConnectionManager.getConnection(
        ncmLocal.nodeId,
      )!;
      expect(connectionPeer).toBeDefined();
      // Trigger destruction of peer connection
      await connectionPeer.connection.destroy({ force: true });
      // Allow time for connection to end
      await connectionPeerDestroyed;
      // Connections should be removed from map
      expect(
        ncmLocal.nodeConnectionManager.hasConnection(ncmPeer1.nodeId),
      ).toBeFalse();
      expect(
        ncmPeer1.nodeConnectionManager.hasConnection(ncmLocal.nodeId),
      ).toBeFalse();
    });
    test('established connections can be used', async () => {
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      const connectionAndTimer = ncmLocal.nodeConnectionManager.getConnection(
        ncmPeer1.nodeId,
      );
      await ncmLocal.nodeConnectionManager.withConnF(
        ncmPeer1.nodeId,
        async () => {
          expect(connectionAndTimer?.usageCount).toBe(1);
          expect(connectionAndTimer?.timer).toBeNull();
        },
      );
      expect(connectionAndTimer?.usageCount).toBe(0);
      expect(connectionAndTimer?.timer).toBeDefined();
    });
    test('only the lowest connectionId connection is used', async () => {
      const connectionsPeerP = testsUtils.promFromEvents(
        ncmPeer1.nodeConnectionManager,
        nodesEvents.EventNodeConnectionManagerConnection,
        4,
      );
      const connectionIdPs = [1, 2, 3, 4].map(async () => {
        const connection =
          await ncmLocal.nodeConnectionManager.createConnection(
            [ncmPeer1.nodeId],
            localHost,
            ncmPeer1.port,
          );
        return connection.connectionId;
      });
      const connectionIds = await Promise.all(connectionIdPs);
      connectionIds.sort();

      await ncmLocal.nodeConnectionManager.withConnF(
        ncmPeer1.nodeId,
        async (connection) => {
          expect(connection.connectionId).toBe(connectionIds[0]);
        },
      );

      await connectionsPeerP;

      // Lowest connection is deterministically the same for the peer too
      await ncmPeer1.nodeConnectionManager.withConnF(
        ncmLocal.nodeId,
        async (connection) => {
          expect(connection.connectionId).toBe(connectionIds[0]);
        },
      );
    });
    test('when a connection is destroyed, the next lowest takes its place', async () => {
      const connectionIdPs = [1, 2, 3, 4].map(async () => {
        const connection =
          await ncmLocal.nodeConnectionManager.createConnection(
            [ncmPeer1.nodeId],
            localHost,
            ncmPeer1.port,
          );
        return connection.connectionId;
      });
      const connectionIds = await Promise.all(connectionIdPs);
      connectionIds.sort();
      for (const connectionId of connectionIds) {
        await ncmLocal.nodeConnectionManager.withConnF(
          ncmPeer1.nodeId,
          async (connection) => {
            // Should always be the lowest alive connectionId
            expect(connection.connectionId).toBe(connectionId);
          },
        );
        await ncmLocal.nodeConnectionManager.destroyConnection(
          ncmPeer1.nodeId,
          true,
          connectionId,
        );
      }
    });
    test('throws when connection is missing', async () => {
      // TODO: check actual error thrown
      await expect(
        ncmLocal.nodeConnectionManager.withConnF(
          ncmPeer1.nodeId,
          async () => {},
        ),
      ).rejects.toThrow();
    });
    test('can handle concurrent connections between local and peer', async () => {
      const connectionsLocalP = testsUtils.promFromEvents(
        ncmLocal.nodeConnectionManager,
        nodesEvents.EventNodeConnectionManagerConnection,
        2,
      );
      const connectionsPeer1P = testsUtils.promFromEvents(
        ncmPeer1.nodeConnectionManager,
        nodesEvents.EventNodeConnectionManagerConnection,
        2,
      );
      await Promise.all([
        connectionsLocalP,
        connectionsPeer1P,
        ncmLocal.nodeConnectionManager.createConnection(
          [ncmPeer1.nodeId],
          localHost,
          ncmPeer1.port,
        ),
        ncmPeer1.nodeConnectionManager.createConnection(
          [ncmLocal.nodeId],
          localHost,
          ncmLocal.port,
        ),
      ]);

      expect(ncmLocal.nodeConnectionManager.connectionsActive()).toBe(2);
      expect(ncmPeer1.nodeConnectionManager.connectionsActive()).toBe(2);
    });
    test('can handle multiple concurrent connections between local and peer', async () => {
      const connectionsLocalP = testsUtils.promFromEvents(
        ncmLocal.nodeConnectionManager,
        nodesEvents.EventNodeConnectionManagerConnection,
        6,
      );
      const connectionsPeer1P = testsUtils.promFromEvents(
        ncmPeer1.nodeConnectionManager,
        nodesEvents.EventNodeConnectionManagerConnection,
        6,
      );
      await Promise.all([
        connectionsLocalP,
        connectionsPeer1P,
        ncmLocal.nodeConnectionManager.createConnection(
          [ncmPeer1.nodeId],
          localHost,
          ncmPeer1.port,
        ),
        ncmLocal.nodeConnectionManager.createConnection(
          [ncmPeer1.nodeId],
          localHost,
          ncmPeer1.port,
        ),
        ncmLocal.nodeConnectionManager.createConnection(
          [ncmPeer1.nodeId],
          localHost,
          ncmPeer1.port,
        ),
        ncmPeer1.nodeConnectionManager.createConnection(
          [ncmLocal.nodeId],
          localHost,
          ncmLocal.port,
        ),
        ncmPeer1.nodeConnectionManager.createConnection(
          [ncmLocal.nodeId],
          localHost,
          ncmLocal.port,
        ),
        ncmPeer1.nodeConnectionManager.createConnection(
          [ncmLocal.nodeId],
          localHost,
          ncmLocal.port,
        ),
      ]);

      expect(ncmLocal.nodeConnectionManager.connectionsActive()).toBe(6);
      expect(ncmPeer1.nodeConnectionManager.connectionsActive()).toBe(6);
    });
    test('connection should timeout after connectionIdleTimeoutTime', async () => {
      // Modify the timeout time value
      const connectionDestroyProm = testsUtils.promFromEvent(
        ncmLocal.nodeConnectionManager,
        nodesEvents.EventNodeConnectionDestroyed,
      );
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
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
        ncmLocal.nodeConnectionManager,
        nodesEvents.EventNodeConnectionDestroyed,
        2,
      );
      const connectionDestroyProm2 = testsUtils.promFromEvents(
        ncmLocal.nodeConnectionManager,
        nodesEvents.EventNodeConnectionDestroyed,
        3,
      );
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      // Wait for timeout.
      await ncmLocal.nodeConnectionManager.withConnF(
        ncmPeer1.nodeId,
        async () => {
          expect(ncmLocal.nodeConnectionManager.connectionsActive()).toBe(3);
          await connectionDestroyProm1;
          expect(ncmLocal.nodeConnectionManager.connectionsActive()).toBe(1);
        },
      );
      await connectionDestroyProm2;
      expect(ncmLocal.nodeConnectionManager.connectionsActive()).toBe(0);
    });
    test('can list active connections', async () => {
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );

      const connectionsList = ncmLocal.nodeConnectionManager.listConnections();
      expect(connectionsList).toHaveLength(3);
      for (const connection of connectionsList) {
        expect(connection.address.host).toBe(localHost);
        expect(connection.address.port).toBe(
          ncmPeer1.nodeConnectionManager.port,
        );
        expect(connection.usageCount).toBe(0);
      }
    });
    test('stopping NodeConnectionManager should destroy all connections', async () => {
      const connection1 = await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      const connection2 = await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      const connection3 = await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );

      expect(ncmLocal.nodeConnectionManager.connectionsActive()).toBe(3);
      expect(connection1[destroyed]).toBeFalse();
      expect(connection2[destroyed]).toBeFalse();
      expect(connection3[destroyed]).toBeFalse();

      await ncmLocal.nodeConnectionManager.stop({ force: true });

      expect(ncmLocal.nodeConnectionManager.connectionsActive()).toBe(0);
      expect(connection1[destroyed]).toBeTrue();
      expect(connection2[destroyed]).toBeTrue();
      expect(connection3[destroyed]).toBeTrue();
    });
  });
  describe('With 2 peers', () => {
    let ncmLocal: NCMState;
    let ncmPeer1: NCMState;
    let ncmPeer2: NCMState;

    beforeEach(async () => {
      ncmLocal = await nodesTestUtils.nodeConnectionManagerFactory({
        keyRing: keysTestUtils.createDummyKeyRing(),
        createOptions: {
          connectionConnectTimeoutTime: timeoutTime,
        },
        startOptions: {
          host: localHost,
          agentService: () => dummyManifest,
        },
        logger: logger.getChild(`${NodeConnectionManager.name}Local`),
      });

      ncmPeer1 = await nodesTestUtils.nodeConnectionManagerFactory({
        keyRing: keysTestUtils.createDummyKeyRing(),
        createOptions: {
          connectionConnectTimeoutTime: timeoutTime,
        },
        startOptions: {
          host: localHost,
          agentService: (nodeConnectionManager) =>
            ({
              nodesConnectionSignalFinal: new NodesConnectionSignalFinal({
                nodeConnectionManager,
                logger,
              }),
              nodesConnectionSignalInitial: new NodesConnectionSignalInitial({
                nodeConnectionManager,
              }),
            }) as AgentServerManifest,
        },
        logger: logger.getChild(`${NodeConnectionManager.name}Peer1`),
      });

      ncmPeer2 = await nodesTestUtils.nodeConnectionManagerFactory({
        keyRing: keysTestUtils.createDummyKeyRing(),
        createOptions: {
          connectionConnectTimeoutTime: timeoutTime,
        },
        startOptions: {
          host: localHost,
          agentService: (nodeConnectionManager) =>
            ({
              nodesConnectionSignalFinal: new NodesConnectionSignalFinal({
                nodeConnectionManager,
                logger,
              }),
              nodesConnectionSignalInitial: new NodesConnectionSignalInitial({
                nodeConnectionManager,
              }),
            }) as AgentServerManifest,
        },
        logger: logger.getChild(`${NodeConnectionManager.name}Peer2`),
      });
    });
    afterEach(async () => {
      await ncmLocal.nodeConnectionManager.stop({ force: true });
      await ncmPeer1.nodeConnectionManager.stop({ force: true });
      await ncmPeer2.nodeConnectionManager.stop({ force: true });
    });

    test('can create a connection with signaling', async () => {
      // Create initial connections of local -> peer1 -> peer2
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      await ncmPeer1.nodeConnectionManager.createConnection(
        [ncmPeer2.nodeId],
        localHost,
        ncmPeer2.port,
      );

      // Should be able to create connection from local to peer2 using peer1 as signaller
      await ncmLocal.nodeConnectionManager.createConnectionPunch(
        ncmPeer2.nodeId,
        ncmPeer1.nodeId,
      );
      expect(
        ncmLocal.nodeConnectionManager.hasConnection(ncmPeer2.nodeId),
      ).toBeTrue();
    });
    test('createConnectionPunch fails with no signaler', async () => {
      // Can't signal without signaler connected
      // TODO: check error type
      await expect(
        ncmLocal.nodeConnectionManager.createConnectionPunch(
          ncmPeer2.nodeId,
          ncmPeer1.nodeId,
        ),
      ).rejects.toThrow();
    });
    test('createConnectionPunch fails with signaller missing connection to target', async () => {
      // Create initial connections of local -> peer1
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      // Can't signal without signaler connected
      // TODO: check error type
      await expect(
        ncmLocal.nodeConnectionManager.createConnectionPunch(
          ncmPeer2.nodeId,
          ncmPeer1.nodeId,
        ),
      ).rejects.toThrow();
    });
    test('can create multiple connections with signaling', async () => {
      // Create initial connections of local -> peer1 -> peer2
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      await ncmPeer1.nodeConnectionManager.createConnection(
        [ncmPeer2.nodeId],
        localHost,
        ncmPeer2.port,
      );
      const holePunchSpy = jest.spyOn(
        ncmPeer2.nodeConnectionManager,
        'holePunch',
      );

      // Should be able to create connection from local to peer2 using peer1 as signaller
      await Promise.all([
        ncmLocal.nodeConnectionManager.createConnectionPunch(
          ncmPeer2.nodeId,
          ncmPeer1.nodeId,
        ),
        ncmLocal.nodeConnectionManager.createConnectionPunch(
          ncmPeer2.nodeId,
          ncmPeer1.nodeId,
        ),
        ncmLocal.nodeConnectionManager.createConnectionPunch(
          ncmPeer2.nodeId,
          ncmPeer1.nodeId,
        ),
      ]);
      expect(
        ncmLocal.nodeConnectionManager.hasConnection(ncmPeer2.nodeId),
      ).toBeTrue();
      // Should have 3 connections + 1 signaller
      expect(ncmLocal.nodeConnectionManager.connectionsActive()).toBe(4);
      // Hole punching was only attempted once
      expect(holePunchSpy).toHaveBeenCalledTimes(1);
    });
    test('can list active connections', async () => {
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer1.nodeId],
        localHost,
        ncmPeer1.port,
      );
      await ncmLocal.nodeConnectionManager.createConnection(
        [ncmPeer2.nodeId],
        localHost,
        ncmPeer2.port,
      );

      const result = ncmLocal.nodeConnectionManager.getClosestConnections(
        ncmPeer2.nodeId,
        20,
      );
      expect(result).toHaveLength(2);
    });
    test.todo('signalling is non-blocking');
    test.todo('signalling is rate limited');
  });
});
