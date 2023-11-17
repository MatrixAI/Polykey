import type { Host, Port } from '@/network/types';
import type { AgentServerManifest } from '@/nodes/agent/handlers';
import type { NodeId } from '@/ids';
import type { KeyRing } from '@/keys';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import * as keysUtils from '@/keys/utils';
import * as nodesUtils from '@/nodes/utils';
import { sleep } from '@/utils';
import * as testsUtils from '../utils';
import NodeConnectionManager from '../../src/nodes/NodeConnectionManager';

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
  const timeoutTime = 100;

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
        { timer: timeoutTime },
      );
      // Should exist in the map now.
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeTrue();
    });
    test('connection can be destroyed', async () => {
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
        { timer: timeoutTime },
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
        { timer: timeoutTime },
      );
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeTrue();
      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(1);
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
        { timer: timeoutTime },
      );
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeTrue();
      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(2);
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
        { timer: timeoutTime },
      );
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeTrue();
      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(3);
    });
    test('specific connection for a node can be destroyed', async () => {
      const connection1 = await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
        { timer: timeoutTime },
      );
      const connection2 = await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
        { timer: timeoutTime },
      );
      const connection3 = await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
        { timer: timeoutTime },
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
        { timer: timeoutTime },
      );
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
        { timer: timeoutTime },
      );
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
        { timer: timeoutTime },
      );
      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(3);
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeTrue();
      await nodeConnectionManagerLocal.destroyConnection(nodeIdPeer1, true);
      expect(nodeConnectionManagerLocal.connectionsActive()).toBe(0);
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeFalse();
    });
    test('connection is removed from map when connection ends', async () => {
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
        { timer: timeoutTime },
      );
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeTrue();
      // Allow time for peer connection to be created
      await sleep(200);
      const connectionPeer =
        nodeConnectionManagerPeer1.getConnection(nodeIdLocal)!;
      expect(connectionPeer).toBeDefined();
      // Trigger destruction of peer connection
      await connectionPeer.connection.destroy({ force: true });
      // Allow time for connection to end
      await sleep(200);
      // Connections should be removed from map
      expect(nodeConnectionManagerLocal.hasConnection(nodeIdPeer1)).toBeFalse();
      expect(nodeConnectionManagerPeer1.hasConnection(nodeIdLocal)).toBeFalse();
    });
    test('established connections can be used', async () => {
      await nodeConnectionManagerLocal.createConnection(
        [nodeIdPeer1],
        localHost,
        portPeer1,
        { timer: timeoutTime },
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
      const connectionIdPs = [1, 2, 3, 4].map(async () => {
        const connection = await nodeConnectionManagerLocal.createConnection(
          [nodeIdPeer1],
          localHost,
          portPeer1,
          { timer: timeoutTime },
        );
        return connection.connectionId;
      });
      const connectionIds = await Promise.all(connectionIdPs);
      console.log(connectionIds);
      connectionIds.sort();
      console.log(connectionIds);

      await nodeConnectionManagerLocal.withConnF(
        nodeIdPeer1,
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
          { timer: timeoutTime },
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
  });

  // With constructed NCM and 2 peers
  test.todo('can create a connection with punching');
  test.todo('check failure conditions of hole punching');
});
