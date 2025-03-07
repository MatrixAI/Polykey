import type { AuditEventId } from '@/ids';
import type NodeConnectionManager from '@/nodes/NodeConnectionManager';
import type Discovery from '@/discovery/Discovery';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { test } from '@fast-check/jest';
import fc from 'fast-check';
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

  test.prop([testNodesUtils.randomAuditEventsArb()])(
    'should get audit events with property based test',
    async (randomEvents) => {
      // Property function
      for (const e of randomEvents) {
        const id = callProtectedGenerateAuditEventId();
        // @ts-ignore: protected
        await audit.setAuditEvent(['node', 'connection', 'forward'], {
          id,
          data: {
            remoteNodeId: e.remoteNodeId,
            remoteHost: e.remoteHost,
            remotePort: e.remotePort,
            type: 'forward',
          },
          path: ['node', 'connection', 'forward'],
        });
      }
      const response = await rpcClient.methods.nodesAuditEventsGet({
        seek: 0,
        seekEnd: Date.now(),
      });
      const auditIds: Array<string> = [];
      for await (const result of response) {
        auditIds.push(result.id);
      }
      expect(auditIds.length).toEqual(randomEvents.length);
      await db.clear(); // Needed to clear the db otherwise results would accumulate
    },
  );

  test.prop([
    testNodesUtils.randomAuditEventsArb(),
    fc.integer({ min: 1, max: 100 }), // LimitVal
  ])(
    'should get audit events with limit (property-based)',
    async (randomEvents, limitVal) => {
      // Insert randomEvents
      for (const e of randomEvents) {
        const id = callProtectedGenerateAuditEventId();
        // @ts-ignore: protected
        await audit.setAuditEvent(['node', 'connection', 'forward'], {
          id,
          data: {
            remoteNodeId: e.remoteNodeId,
            remoteHost: e.remoteHost,
            remotePort: e.remotePort,
            type: 'forward',
          },
          path: ['node', 'connection', 'forward'],
        });
      }

      // Query using the randomly generated limitVal
      const response = await rpcClient.methods.nodesAuditEventsGet({
        seek: 0,
        seekEnd: Date.now(),
        limit: limitVal,
      });
      const auditIds: Array<string> = [];
      for await (const result of response) {
        auditIds.push(result.id);
      }

      // We expect min(arrayLength, limitVal) results
      const expected = Math.min(randomEvents.length, limitVal);
      expect(auditIds).toHaveLength(expected);

      // Finally, clear the DB for the next run
      await db.clear();
    },
  );

  test.prop([
    testNodesUtils
      .randomAuditEventsArb(2, 100) // At least 2 so there's a valid seek index
      .chain((events) =>
        fc.record({
          events: fc.constant(events),
          seekIndex: fc.integer({ min: 0, max: events.length - 1 }),
        }),
      ),
  ])(
    'should get audit events with a random seek index (property-based)',
    async ({ events, seekIndex }) => {
      // Insert the random events and store the generated AuditEventIds
      const eventIds: Array<AuditEventId> = [];
      for (const e of events) {
        const id = callProtectedGenerateAuditEventId();
        // @ts-ignore: protected
        await audit.setAuditEvent(['node', 'connection', 'forward'], {
          id,
          data: {
            remoteNodeId: e.remoteNodeId,
            remoteHost: e.remoteHost,
            remotePort: e.remotePort,
            type: 'forward',
          },
          path: ['node', 'connection', 'forward'],
        });
        eventIds.push(id);
      }

      const seekValueEncoded = auditUtils.encodeAuditEventId(
        eventIds[seekIndex],
      );

      const response = await rpcClient.methods.nodesAuditEventsGet({
        seek: seekValueEncoded,
      });

      // Collect results
      const auditIds: Array<string> = [];
      for await (const result of response) {
        auditIds.push(result.id);
      }

      // We expect everything AFTER the seekIndex event INCLUDING the seekIndex event
      // => from (seekIndex) to the end
      const expectedIds = eventIds
        .slice(seekIndex)
        .map((id) => auditUtils.encodeAuditEventId(id));

      // Check that we only get the tail portion including the seekIndex event
      expect(auditIds).toEqual(expectedIds);

      // Reset DB so subsequent runs in this property-based test
      // don't accumulate leftover events.
      await db.clear();
    },
  );

  test.prop([
    testNodesUtils.randomAuditEventsArb(2), // At least 2 so there's a valid seek index
  ])(
    'should get audit events with specific seek at index 0 [property-based]',
    async (events) => {
      const eventIds: Array<AuditEventId> = [];
      for (const e of events) {
        const id = callProtectedGenerateAuditEventId();
        // @ts-ignore: protected
        await audit.setAuditEvent(['node', 'connection', 'forward'], {
          id,
          data: {
            remoteNodeId: e.remoteNodeId,
            remoteHost: e.remoteHost,
            remotePort: e.remotePort,
            type: 'forward',
          },
          path: ['node', 'connection', 'forward'],
        });
        eventIds.push(id);
      }

      // Seek the event at index 0
      const seekIndex = 0;
      const seekIdEncoded = auditUtils.encodeAuditEventId(eventIds[seekIndex]);

      // Make the RPC call
      const response = await rpcClient.methods.nodesAuditEventsGet({
        seek: seekIdEncoded,
      });

      // Collect results
      const auditIds: Array<string> = [];
      for await (const result of response) {
        auditIds.push(result.id);
      }

      // We expect everything from index 1 onward including the seekIndex event
      const expectedIds = eventIds
        .slice(seekIndex)
        .map((id) => auditUtils.encodeAuditEventId(id));

      expect(auditIds).toEqual(expectedIds);

      // Clear DB for the next run
      await db.clear();
    },
  );

  test.prop([
    testNodesUtils.randomAuditEventsArb(1), // At least 1 event, so "last index" = length-1 is valid
  ])(
    'should get audit events with specific seek at last index [property-based]',
    async (events) => {
      // 1) Insert them all
      const eventIds: Array<AuditEventId> = [];
      for (const e of events) {
        const id = callProtectedGenerateAuditEventId();
        // @ts-ignore: protected
        await audit.setAuditEvent(['node', 'connection', 'forward'], {
          id,
          data: {
            remoteNodeId: e.remoteNodeId,
            remoteHost: e.remoteHost,
            remotePort: e.remotePort,
            type: 'forward',
          },
          path: ['node', 'connection', 'forward'],
        });
        eventIds.push(id);
      }

      // 2) Seek the event at the last index
      const seekIndex = eventIds.length - 1;
      const seekIdEncoded = auditUtils.encodeAuditEventId(eventIds[seekIndex]);

      const response = await rpcClient.methods.nodesAuditEventsGet({
        seek: seekIdEncoded,
      });

      const auditIds: Array<string> = [];
      for await (const result of response) {
        auditIds.push(result.id);
      }

      // We expect a SINGLE result, because it should only return the seekIndex event
      expect(auditIds).toHaveLength(1);

      // Clear DB for the next run
      await db.clear();
    },
  );
});
