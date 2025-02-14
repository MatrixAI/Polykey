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
import * as tlsTestsUtils from '../../../utils/tls';
import * as auditUtils from '@/audit/utils';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import Discovery from '@/discovery/Discovery';
import { IdInternal } from '@matrixai/id';
import { AuditEventId } from '@/ids';
import { TopicPath } from '@/audit/types';

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
        //@ts-ignore: calling protected method
        return audit.generateAuditEventId();
    }

    test('should get audit events', async () => {
        // Generate valid AuditEventIds
        const mockAuditEvents = [
            {
                id: callProtectedGenerateAuditEventId(),
                path: ['node', 'connection', 'reverse'],
                data: {
                    remoteNodeId: 'asdasd',
                    remoteHost: '127.0.0.1',
                    remotePort: 54321,
                    type: 'reverse'
                }
            },
            {
                id: callProtectedGenerateAuditEventId(),
                path: ['node', 'connection', 'reverse'],
                data: {
                    remoteNodeId: 'asdasd',
                    remoteHost: '127.0.0.1',
                    remotePort: 54321,
                    type: 'reverse'
                }
            }
        ];

        // Add events with correct topicPath and full path in event data
        for (const event of mockAuditEvents) {

            //@ts-ignore: accessing a protected method
            await audit.setAuditEvent(
                [
                    'node',
                    'connection',
                    'forward',
                ],
                {
                    // @ts-ignore: protected
                    id: event.id,
                    data: {
                        remoteNodeId: 'asdasd',
                        remoteHost: '127.0.0.1',
                        remotePort: 54321,
                        type: 'forward'
                    },
                    path: [
                        'node',
                        'connection',
                        'forward',
                    ],
                },
            );
        }

        // Call RPC method with required auditIdEncoded parameter
        try {
            console.log("attempt rpc call");
            const response = await rpcClient.methods.nodesAuditEventsGet({
                seek: 0,
                seekEnd: Date.now(),
                limit: 10
            });

            // Collect results
            const auditIds: Array<string> = [];
            for await (const result of response) {
                auditIds.push(result.id);
            }

            console.log(auditIds);
            // Verify all events were returned with correct encoded IDs
            expect(auditIds).toHaveLength(mockAuditEvents.length);
            expect(auditIds).toEqual(
                mockAuditEvents.map(event => auditUtils.encodeAuditEventId(event.id))
            );

            

        } catch (error) {
            console.log("error");
            console.error(error);

            throw error;

        }

    });
});