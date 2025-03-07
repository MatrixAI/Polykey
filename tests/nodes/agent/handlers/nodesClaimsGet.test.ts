import type { IdentityId, ProviderId } from '@/identities/types';
import type { ClaimIdEncoded } from '@/ids';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { QUICClient, QUICServer, events as quicEvents } from '@matrixai/quic';
import { DB } from '@matrixai/db';
import { RPCClient, RPCServer } from '@matrixai/rpc';
import * as nodesUtils from '@/nodes/utils';
import { encodeProviderIdentityId } from '@/identities/utils';
import NodesClaimsGet from '@/nodes/agent/handlers/NodesClaimsGet';
import { nodesClaimsGet } from '@/nodes/agent/callers';
import KeyRing from '@/keys/KeyRing';
import Sigchain from '@/sigchain/Sigchain';
import * as keysUtils from '@/keys/utils';
import * as networkUtils from '@/network/utils';
import * as tlsTestsUtils from '../../../utils/tls';
import * as testNodesUtils from '../../../nodes/utils';

describe('nodesClaimsGet', () => {
  const logger = new Logger('nodesClaimsGet test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'password';
  const localHost = '127.0.0.1';

  let dataDir: string;

  let keyRing: KeyRing;
  let db: DB;
  let sigchain: Sigchain;
  let rpcServer: RPCServer;
  let quicServer: QUICServer;

  const clientManifest = {
    nodesClaimsGet: nodesClaimsGet,
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
    sigchain = await Sigchain.createSigchain({
      keyRing,
      db,
      logger,
    });

    // Setting up server
    const serverManifest = {
      nodesClaimsGet: new NodesClaimsGet({
        db,
        sigchain,
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
      logger.info('!!!!Handling new stream!!!!!');
      rpcServer.handleStream(stream);
    };
    const handleConnection = async (
      event: quicEvents.EventQUICServerConnection,
    ) => {
      // Needs to setup stream handler
      const conn = event.detail;
      logger.info('!!!!Handling new Connection!!!!!');
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

    const response = await rpcClient.methods.nodesClaimsGet({});
    const chainIds: Array<string> = [];
    for await (const claim of response) {
      chainIds.push(claim.claimIdEncoded ?? '');
    }
    expect(chainIds).toHaveLength(10);
  });

  test('Should get chain data with limit', async () => {
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

    const limitVal = 5;

    const response = await rpcClient.methods.nodesClaimsGet({
      limit: limitVal,
    });
    const chainIds: Array<string> = [];
    for await (const claim of response) {
      chainIds.push(claim.claimIdEncoded ?? '');
    }
    expect(chainIds).toHaveLength(5);
  });

  test('Should get chain data with order asc and desc', async () => {
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

    // Test for descending order
    let response = await rpcClient.methods.nodesClaimsGet({
      order: 'desc',
    });
    let chainIds: Array<string> = [];
    for await (const claim of response) {
      chainIds.push(claim.claimIdEncoded ?? '');
    }

    // Verify that chainIds are in descending order
    let isSorted = true;
    for (let i = 0; i < chainIds.length - 1; i++) {
      if (chainIds[i] < chainIds[i + 1]) {
        isSorted = false;
        break;
      }
    }
    expect(isSorted).toBe(true);

    // Test for ascending order
    response = await rpcClient.methods.nodesClaimsGet({
      order: 'asc',
    });
    chainIds = [];
    for await (const claim of response) {
      chainIds.push(claim.claimIdEncoded ?? '');
    }

    // Verify that chainIds are in ascending order
    isSorted = true;
    for (let i = 0; i < chainIds.length - 1; i++) {
      if (chainIds[i] > chainIds[i + 1]) {
        isSorted = false;
        break;
      }
    }
    expect(isSorted).toBe(true);
  });

  test('Should return no results when the DB is empty', async () => {
    // We do not add any claims to the DB here, leaving it empty

    // Make the RPC call without any parameters
    const response = await rpcClient.methods.nodesClaimsGet({});

    // Collect all results into an array
    const claimIds: Array<string> = [];
    for await (const claim of response) {
      claimIds.push(claim.claimIdEncoded ?? '');
    }

    // Verify the array is empty
    expect(claimIds).toHaveLength(0);
  });

  test('Should get chain data with valid seek parameter and all chain data if invalid seek', async () => {
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

    // First, if we provide an invalid seek value, we should get all claims.
    let response = await rpcClient.methods.nodesClaimsGet({ seek: undefined });
    const allClaimIds: ClaimIdEncoded[] = [];
    for await (const claim of response) {
      // We assume claimIdEncoded is defined for all returned claims.
      allClaimIds.push(claim.claimIdEncoded!);
    }
    expect(allClaimIds).toHaveLength(10);

    // Now choose a seek claim.
    const seekClaimId = allClaimIds[3];

    // Now retrieve claims starting from the seek value.
    response = await rpcClient.methods.nodesClaimsGet({
      order: 'asc',
      seek: seekClaimId,
    });
    const subsetClaimIds: string[] = [];
    for await (const claim of response) {
      subsetClaimIds.push(claim.claimIdEncoded!);
    }

    // Our expectation is that the claim with the seek value is excluded
    // and that the remaining claims match the tail of allClaimIds.
    expect(subsetClaimIds).toEqual(allClaimIds.slice(3));
  });
});
