import type { IdentityId, ProviderId } from '@/identities/types';
import type { ClaimIdEncoded } from '@/ids';
import type * as quicEvents from '@matrixai/quic/dist/events';
import type { Host as QUICHost } from '@matrixai/quic';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { QUICClient, QUICServer } from '@matrixai/quic';
import { DB } from '@matrixai/db';
import * as nodesUtils from '@/nodes/utils';
import { encodeProviderIdentityId } from '@/identities/utils';
import RPCClient from '@/rpc/RPCClient';
import RPCServer from '@/rpc/RPCServer';
import { NodesChainDataGetHandler } from '@/agent/handlers/nodesChainDataGet';
import { nodesChainDataGet } from '@/agent/handlers/clientManifest';
import KeyRing from '@/keys/KeyRing';
import Sigchain from '@/sigchain/Sigchain';
import * as keysUtils from '@/keys/utils/index';
import * as tlsTestsUtils from '../../utils/tls';
import * as testNodesUtils from '../../nodes/utils';

describe('nodesChainDataGet', () => {
  const logger = new Logger('nodesChainDataGet test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'password';
  const crypto = tlsTestsUtils.createCrypto();
  const localHost = '127.0.0.1' as QUICHost;

  let dataDir: string;

  let keyRing: KeyRing;
  let db: DB;
  let sigchain: Sigchain;
  let rpcServer: RPCServer;
  let quicServer: QUICServer;

  const clientManifest = {
    nodesChainDataGet,
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
    sigchain = await Sigchain.createSigchain({
      keyRing,
      db,
      logger,
    });

    // Setting up server
    const serverManifest = {
      nodesChainDataGet: new NodesChainDataGetHandler({
        db,
        sigchain,
      }),
    };
    rpcServer = await RPCServer.createRPCServer({
      manifest: serverManifest,
      logger,
    });
    const tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);
    quicServer = new QUICServer({
      config: {
        key: tlsConfig.keyPrivatePem,
        cert: tlsConfig.certChainPem,
        verifyPeer: false,
      },
      crypto,
      logger,
    });
    const handleStream = async (
      event: quicEvents.QUICConnectionStreamEvent,
    ) => {
      // Streams are handled via the RPCServer.
      const stream = event.detail;
      logger.info('!!!!Handling new stream!!!!!');
      rpcServer.handleStream(stream);
    };
    const handleConnection = async (
      event: quicEvents.QUICServerConnectionEvent,
    ) => {
      // Needs to setup stream handler
      const conn = event.detail;
      logger.info('!!!!Handling new Connection!!!!!');
      conn.addEventListener('connectionStream', handleStream);
      conn.addEventListener(
        'connectionStop',
        () => {
          conn.removeEventListener('connectionStream', handleStream);
        },
        { once: true },
      );
    };
    quicServer.addEventListener('serverConnection', handleConnection);
    quicServer.addEventListener(
      'serverStop',
      () => {
        quicServer.removeEventListener('serverConnection', handleConnection);
      },
      { once: true },
    );
    await quicServer.start({
      host: localHost,
    });

    // Setting up client
    rpcClient = await RPCClient.createRPCClient({
      manifest: clientManifest,
      streamFactory: () => {
        return quicClient.connection.streamNew();
      },
      logger,
    });
    quicClient = await QUICClient.createQUICClient({
      crypto,
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
    await rpcServer.destroy(true);
    await quicServer.stop({ force: true });
    await sigchain.stop();
    await db.stop();
    await keyRing.stop();
  });

  test('Should get chain data', async () => {
    const srcNodeIdEncoded = nodesUtils.encodeNodeId(keyRing.getNodeId());
    // Add 10 claims
    for (let i = 1; i <= 5; i++) {
      const node2 = nodesUtils.encodeNodeId(
        testNodesUtils.generateRandomNodeId(),
      );
      const nodeLink = {
        type: 'ClaimLinkNode',
        iss: srcNodeIdEncoded,
        sub: node2,
      };
      await sigchain.addClaim(nodeLink);
    }
    for (let i = 6; i <= 10; i++) {
      const identityLink = {
        type: 'ClaimLinkIdentity',
        iss: srcNodeIdEncoded,
        sub: encodeProviderIdentityId([
          ('ProviderId' + i.toString()) as ProviderId,
          ('IdentityId' + i.toString()) as IdentityId,
        ]),
      };
      await sigchain.addClaim(identityLink);
    }

    const response = await rpcClient.methods.nodesChainDataGet({
      claimIdEncoded: '' as ClaimIdEncoded,
    });
    const chainIds: Array<string> = [];
    for await (const claim of response) {
      chainIds.push(claim.claimIdEncoded ?? '');
    }
    expect(chainIds).toHaveLength(10);
  });
});
