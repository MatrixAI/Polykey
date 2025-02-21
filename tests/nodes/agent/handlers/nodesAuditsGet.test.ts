import type { AuditEventId } from '@/ids';
import fc from 'fast-check';
import type NodeConnectionManager from '@/nodes/NodeConnectionManager';
import type Discovery from '@/discovery/Discovery';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { QUICClient, QUICServer, events as quicEvents } from '@matrixai/quic';
import { DB } from '@matrixai/db';
import { RPCClient, RPCServer } from '@matrixai/rpc';
import NodesAuditEventsGet from '@/nodes/agent/handlers/NodesAuditEventsGet';
import { nodesAuditEventsGet } from '@/nodes/agent/callers';
import * as nodesUtils from '@/nodes/utils';
import KeyRing from '@/keys/KeyRing';
import Audit from '@/audit/Audit';
import * as keysUtils from '@/keys/utils';
import * as networkUtils from '@/network/utils';
import * as auditUtils from '@/audit/utils';
import * as tlsTestsUtils from '../../../utils/tls';
import * as testNodesUtils from '../../../nodes/utils';

describe('nodesAuditEventsGet', () => {
  const logger = new Logger('nodesAuditEventsGet test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'password';
  const localHost = '127.0.0.1';

  let dataDir: string;

  let keyRing: KeyRing;
  let db: DB;
  let audit: Audit;
  let rpcServer: RPCServer;
  let quicServer: QUICServer;

  const clientManifest = {
    nodesAuditEventsGet: nodesAuditEventsGet,
  };
  type ClientManifest = typeof clientManifest;
  let rpcClient: RPCClient<ClientManifest>;
  let quicClient: QUICClient;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );

    // Handler dependencies
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      keysPath,
      password,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    audit = await Audit.createAudit({
      db,
      nodeConnectionManager: new EventTarget() as NodeConnectionManager,
      discovery: new EventTarget() as Discovery,
      logger,
    });

    // Setting up server
    const serverManifest = {
      nodesAuditEventsGet: new NodesAuditEventsGet({
        db,
        audit,
      }),
    };
    rpcServer = new RPCServer({
      fromError: networkUtils.fromError,
      logger,
    });

    await rpcServer.start({ manifest: serverManifest });
    const tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);
    quicServer = new QUICServer({
      config: {
        key: tlsConfig.keyPrivatePem,
        cert: tlsConfig.certChainPem,
        verifyPeer: false,
      },
      crypto: nodesUtils.quicServerCrypto,
      logger,
    });
    const handleStream = async (
      event: quicEvents.EventQUICConnectionStream,
    ) => {
      // Streams are handled via the RPCServer.
      const stream = event.detail;
      logger.info('Handling new stream');
      rpcServer.handleStream(stream);
    };
    const handleConnection = async (
      event: quicEvents.EventQUICServerConnection,
    ) => {
      // Needs to setup stream handler
      const conn = event.detail;
      logger.info('Handling new connection');
      conn.addEventListener(
        quicEvents.EventQUICConnectionStream.name,
        handleStream,
      );
      conn.addEventListener(
        quicEvents.EventQUICConnectionStopped.name,
        () => {
          conn.removeEventListener(
            quicEvents.EventQUICConnectionStream.name,
            handleStream,
          );
        },
        { once: true },
      );
    };
    quicServer.addEventListener(
      quicEvents.EventQUICServerConnection.name,
      handleConnection,
    );
    quicServer.addEventListener(
      quicEvents.EventQUICConnectionStopped.name,
      () => {
        quicServer.removeEventListener(
          quicEvents.EventQUICServerConnection.name,
          handleConnection,
        );
      },
      { once: true },
    );
    await quicServer.start({
      host: localHost,
    });

    // Setting up client
    rpcClient = new RPCClient({
      manifest: clientManifest,
      streamFactory: async () => {
        return quicClient.connection.newStream();
      },
      toError: networkUtils.toError,
      logger,
    });
    quicClient = await QUICClient.createQUICClient({
      crypto: nodesUtils.quicClientCrypto,
      config: {
        verifyPeer: false,
      },
      host: localHost,
      port: quicServer.port,
      localHost: localHost,
      logger,
    });
  });

  afterEach(async () => {
    await rpcServer.stop({ force: true });
    await quicServer.stop({ force: true });
    await audit.stop();
    await db.stop();
    await keyRing.stop();
  });

  function callProtectedGenerateAuditEventId(): AuditEventId {
    // @ts-ignore: calling protected method
    return audit.generateAuditEventId();
  }

/**
 * Generates an array of mock audit events of size `numEvents`.
 * - Uses `callProtectedGenerateAuditEventId` to get the ID (passed in).
 * - Uses fast-check to randomize `remoteNodeId`, `remoteHost`, and `remotePort`.
 */
function generateMockAuditEvents(
    numEvents: number,
    callProtectedGenerateAuditEventId: () => AuditEventId
  ) {
    // Define an arbitrary for the fields we want to randomize:
    const randomFieldsArb = fc.record({
      remoteHost: fc.ipV4(),
      remotePort: fc.nat({ max: 65535 }),
    });
  
    // Generate numEvents samples:
    const randomValues = fc.sample(randomFieldsArb, numEvents);
  
    // Map each random object to the expected AuditEvent shape:
    return randomValues.map(value => ({
      id: callProtectedGenerateAuditEventId(),
      path: ['node', 'connection', 'reverse'],
      data: {
        remoteNodeId: nodesUtils.encodeNodeId(testNodesUtils.generateRandomNodeId()),
        remoteHost: value.remoteHost,
        remotePort: value.remotePort,
        type: 'reverse',
      },
    }));
  }


  test('should get audit events', async () => {
    // Generate valid AuditEventIds
    const mockAuditEvents = generateMockAuditEvents(100, callProtectedGenerateAuditEventId);

    // Add events with correct topicPath and full path in event data
    for (const event of mockAuditEvents) {
      // @ts-ignore: accessing a protected method
      await audit.setAuditEvent(['node', 'connection', 'forward'], {
        // @ts-ignore: protected
        id: event.id,
        data: {
          remoteNodeId: 'asdasd',
          remoteHost: '127.0.0.1',
          remotePort: 54321,
          type: 'forward',
        },
        path: ['node', 'connection', 'forward'],
      });
    }

    //Parameters
    let seekValue = 0;
    let seekEndVal = Date.now();

    try {
      const response = await rpcClient.methods.nodesAuditEventsGet({
        seek: seekValue,
        seekEnd: seekEndVal,
      });

      // Collect results
      const auditIds: Array<string> = [];
      for await (const result of response) {
        auditIds.push(result.id);
    }

    const mappedMockedAuditEvents = mockAuditEvents.map((event) => auditUtils.encodeAuditEventId(event.id))

      //Check if the audits grabbed from the rpc handler is the same as the generated audits from mockAuditEvents
      expect(auditIds).toEqual(
        mappedMockedAuditEvents
      );
    } catch (error) {

      throw error;
    }
  });

  test('should get audit events with limit', async () => {
    // Generate valid AuditEventIds
    const mockAuditEvents = generateMockAuditEvents(100, callProtectedGenerateAuditEventId);

    // Add events with correct topicPath and full path in event data
    for (const event of mockAuditEvents) {
      // @ts-ignore: accessing a protected method
      await audit.setAuditEvent(['node', 'connection', 'forward'], {
        // @ts-ignore: protected
        id: event.id,
        data: {
          remoteNodeId: 'asdasd',
          remoteHost: '127.0.0.1',
          remotePort: 54321,
          type: 'forward',
        },
        path: ['node', 'connection', 'forward'],
      });
    }
    //Parameters
    let seekValue = 0;
    let seekEndVal = Date.now();
    let limitVal = 50;

    try {
      const response = await rpcClient.methods.nodesAuditEventsGet({
        seek: seekValue,
        seekEnd: seekEndVal,
        limit: limitVal,
      });

      // Collect results
      const auditIds: Array<string> = [];
      for await (const result of response) {
        auditIds.push(result.id);
    }

      // Verify that the number of events returned is equal to the limit
      expect(auditIds).toHaveLength(limitVal);

    } catch (error) {

      throw error;
    }
  });


  test('should get audit events with specific seek = 50', async () => {
    // Generate valid AuditEventIds
    const mockAuditEvents = generateMockAuditEvents(100, callProtectedGenerateAuditEventId);

    // Add events with correct topicPath and full path in event data
    for (const event of mockAuditEvents) {
      // @ts-ignore: accessing a protected method
      await audit.setAuditEvent(['node', 'connection', 'forward'], {
        // @ts-ignore: protected
        id: event.id,
        data: {
          remoteNodeId: 'asdasd',
          remoteHost: '127.0.0.1',
          remotePort: 54321,
          type: 'forward',
        },
        path: ['node', 'connection', 'forward'],
      });
    }

    //Pick some value to seek from the mockAuditEvents selected from the mockAuditEvents
    let seekIndex = 50;
    let seekValueEncoded = auditUtils.encodeAuditEventId(mockAuditEvents[seekIndex].id);
  

    try {
      const response = await rpcClient.methods.nodesAuditEventsGet({
        seek: seekValueEncoded,
      });

      // Collect results
      const auditIds: Array<string> = [];
      for await (const result of response) {
        auditIds.push(result.id);
    }

    //Verify that the results are the same as the mockAuditEvents from the seek value onwards
    expect(auditIds).toEqual(
      mockAuditEvents.slice(seekIndex + 1).map((event) => auditUtils.encodeAuditEventId(event.id))
    );

    //Additionally, verify the seek value is exclusive and should be excluded from the results.
    expect(auditIds).not.toContain(seekValueEncoded);


    } catch (error) {
      console.error(error);
      throw error;
    }

  });

  test('should get audit events with specific seek at index 0 (exclude the first event)', async () => {
    // Generate valid AuditEventIds
    const mockAuditEvents = generateMockAuditEvents(100, callProtectedGenerateAuditEventId);
  
    // Insert them all
    for (const event of mockAuditEvents) {
      // @ts-ignore: protected
      await audit.setAuditEvent(['node', 'connection', 'forward'], {
        // @ts-ignore: protected
        id: event.id,
        data: {
          remoteNodeId: 'asdasd',
          remoteHost: '127.0.0.1',
          remotePort: 54321,
          type: 'forward',
        },
        path: ['node', 'connection', 'forward'],
      });
    }
  
    // Seek the event at index 0
    const seekIndex = 0;
    const seekId = mockAuditEvents[seekIndex].id;
    const seekIdEncoded = auditUtils.encodeAuditEventId(seekId);
  
    try {
      // Make the RPC call
      const response = await rpcClient.methods.nodesAuditEventsGet({
        seek: seekIdEncoded,
      });
  
      // Collect results
      const auditIds: Array<string> = [];
      for await (const result of response) {
        auditIds.push(result.id);
      }
  
      // Expect everything from index 1 onward
      // (index 0 is excluded because we said exclusive).
      const expectedIds = mockAuditEvents
        .slice(seekIndex + 1)
        .map((event) => auditUtils.encodeAuditEventId(event.id));
  
      expect(auditIds).toEqual(expectedIds);
      // And confirm index 0 is NOT in the list
      expect(auditIds).not.toContain(seekIdEncoded);
    } catch (error) {
      console.error(error);
      throw error;
    }
  });
  
  test('should get audit events with specific seek at index 99 (exclude the last event)', async () => {
    // Generate valid AuditEventIds
    const mockAuditEvents = generateMockAuditEvents(100, callProtectedGenerateAuditEventId);
  
    // Insert them all
    for (const event of mockAuditEvents) {
      // @ts-ignore: protected
      await audit.setAuditEvent(['node', 'connection', 'forward'], {
        // @ts-ignore: protected
        id: event.id,
        data: {
          remoteNodeId: 'asdasd',
          remoteHost: '127.0.0.1',
          remotePort: 54321,
          type: 'forward',
        },
        path: ['node', 'connection', 'forward'],
      });
    }
  
    // Seek the event at index 99
    const seekIndex = 99;
    const seekId = mockAuditEvents[seekIndex].id;
    const seekIdEncoded = auditUtils.encodeAuditEventId(seekId);
  
    try {
      // Make the RPC call
      const response = await rpcClient.methods.nodesAuditEventsGet({
        seek: seekIdEncoded,
      });
  
      // Collect results
      const auditIds: Array<string> = [];
      for await (const result of response) {
        auditIds.push(result.id);
      }
  
      // We expect an EMPTY result, because there's nothing after index 99
      // (the last event is excluded).
      expect(auditIds).toHaveLength(0);
      // Confirm that the last event’s ID is not present
      expect(auditIds).not.toContain(seekIdEncoded);
    } catch (error) {
      console.error(error);
      throw error;
    }
  });
  


});
