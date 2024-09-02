import type NodeConnectionManager from '@/nodes/NodeConnectionManager';
import type { NodeId } from '@/ids';
import type { KeyPair } from '@/keys/types';
import type { SignedTokenEncoded } from '@/tokens/types';
import type { ClaimNetworkAuthority } from '@/claims/payloads/claimNetworkAuthority';
import type { ClaimNetworkAccess } from '@/claims/payloads/claimNetworkAccess';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { QUICClient, QUICServer, events as quicEvents } from '@matrixai/quic';
import { DB } from '@matrixai/db';
import { RPCClient, RPCServer } from '@matrixai/rpc';
import { nodesClaimNetworkVerify } from '@/nodes/agent/callers';
import { Token } from '@/tokens';
import Sigchain from '@/sigchain/Sigchain';
import KeyRing from '@/keys/KeyRing';
import NodeGraph from '@/nodes/NodeGraph';
import NodesClaimNetworkVerify from '@/nodes/agent/handlers/NodesClaimNetworkVerify';
import ACL from '@/acl/ACL';
import NodeManager from '@/nodes/NodeManager';
import GestaltGraph from '@/gestalts/GestaltGraph';
import TaskManager from '@/tasks/TaskManager';
import * as keysUtils from '@/keys/utils';
import * as claimsUtils from '@/claims/utils';
import * as nodesUtils from '@/nodes/utils';
import * as networkUtils from '@/network/utils';
import * as tlsTestsUtils from '../../../utils/tls';

describe('nodesClaimNetworkVerify', () => {
  const logger = new Logger('nodesClaimNetworkVerify test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'password';
  const localHost = '127.0.0.1';

  let dataDir: string;

  let keyRing: KeyRing;
  let acl: ACL;
  let remoteNodeId: NodeId;
  let db: DB;
  let sigchain: Sigchain;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let rpcServer: RPCServer;
  let quicServer: QUICServer;

  const clientManifest = {
    nodesClaimNetworkVerify,
  };
  type ClientManifest = typeof clientManifest;
  let rpcClient: RPCClient<ClientManifest>;
  let quicClient: QUICClient;
  let authorityKeyPair: KeyPair;
  let authorityNodeId: NodeId;
  let seedKeyPair: KeyPair;
  let seedNodeId: NodeId;
  let clientKeyPair: KeyPair;
  let localNodeId: NodeId;
  let signedClaimNetworkAuthorityEncoded: SignedTokenEncoded;

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
    remoteNodeId = keyRing.getNodeId();
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

    acl = await ACL.createACL({
      db,
      logger,
    });
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
    });
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    const nodeManager = new NodeManager({
      db,
      keyRing,
      gestaltGraph,
      nodeConnectionManager: {} as NodeConnectionManager,
      nodeGraph: {} as NodeGraph,
      sigchain,
      taskManager,
      logger,
    });
    await taskManager.startProcessing();

    // Setting up server
    const serverManifest = {
      nodesClaimNetworkVerify: new NodesClaimNetworkVerify({
        nodeManager,
      }),
    };
    rpcServer = new RPCServer({
      fromError: networkUtils.fromError,
      logger,
    });
    await rpcServer.start({ manifest: serverManifest });
    const tlsConfigServer = await tlsTestsUtils.createTLSConfig(
      keyRing.keyPair,
    );
    quicServer = new QUICServer({
      config: {
        key: tlsConfigServer.keyPrivatePem,
        cert: tlsConfigServer.certChainPem,
        verifyPeer: true,
        verifyCallback: async () => {
          return undefined;
        },
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
      quicEvents.EventQUICSocketStopped.name,
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

    clientKeyPair = keysUtils.generateKeyPair();

    localNodeId = keysUtils.publicKeyToNodeId(clientKeyPair.publicKey);
    const tlsConfigClient = await tlsTestsUtils.createTLSConfig(clientKeyPair);
    quicClient = await QUICClient.createQUICClient({
      crypto: nodesUtils.quicClientCrypto,
      config: {
        key: tlsConfigClient.keyPrivatePem,
        cert: tlsConfigClient.certChainPem,
        verifyPeer: true,
        verifyCallback: async () => {
          return undefined;
        },
      },
      host: localHost,
      port: quicServer.port,
      localHost: localHost,
      logger,
    });

    authorityKeyPair = keysUtils.generateKeyPair();
    authorityNodeId = keysUtils.publicKeyToNodeId(authorityKeyPair.publicKey);
    seedKeyPair = keysUtils.generateKeyPair();
    seedNodeId = keysUtils.publicKeyToNodeId(seedKeyPair.publicKey);
    const authorityClaimId =
      claimsUtils.createClaimIdGenerator(authorityNodeId)();
    const authorityClaim: ClaimNetworkAuthority = {
      typ: 'ClaimNetworkAuthority',
      iss: nodesUtils.encodeNodeId(authorityNodeId),
      sub: nodesUtils.encodeNodeId(seedNodeId),
      jti: claimsUtils.encodeClaimId(authorityClaimId),
      iat: 0,
      nbf: 0,
      seq: 0,
      prevDigest: null,
      prevClaimId: null,
    };
    const authorityToken = Token.fromPayload(authorityClaim);
    authorityToken.signWithPrivateKey(authorityKeyPair.privateKey);
    authorityToken.signWithPrivateKey(seedKeyPair.privateKey);
    signedClaimNetworkAuthorityEncoded = claimsUtils.generateSignedClaim(
      authorityToken.toSigned(),
    );
    await sigchain.addClaim(
      {
        typ: 'ClaimNetworkAccess',
        iss: nodesUtils.encodeNodeId(seedNodeId),
        sub: nodesUtils.encodeNodeId(remoteNodeId),
        signedClaimNetworkAuthorityEncoded,
        network: '',
      },
      new Date(),
      async (token) => {
        token.signWithPrivateKey(seedKeyPair.privateKey);
        return token;
      },
    );
  });
  afterEach(async () => {
    await taskManager.stop();
    await rpcServer.stop({ force: true });
    await quicServer.stop({ force: true });
    await nodeGraph.stop();
    await sigchain.stop();
    await db.stop();
    await keyRing.stop();

    await quicServer.stop({ force: true });
    await quicClient.destroy({ force: true });
  });
  test('successfully verifies a claim', async () => {
    // Adding into the ACL
    await acl.setNodePerm(localNodeId, {
      gestalt: {
        claim: null,
        scan: null,
      },
      vaults: {},
    });
    const accessClaimId = claimsUtils.createClaimIdGenerator(authorityNodeId)();
    const accessClaim: ClaimNetworkAccess = {
      typ: 'ClaimNetworkAccess',
      iss: nodesUtils.encodeNodeId(seedNodeId),
      sub: nodesUtils.encodeNodeId(localNodeId),
      jti: claimsUtils.encodeClaimId(accessClaimId),
      iat: 0,
      nbf: 0,
      seq: 0,
      prevDigest: null,
      prevClaimId: null,
      signedClaimNetworkAuthorityEncoded,
      network: '',
    };
    const accessToken = Token.fromPayload(accessClaim);
    accessToken.signWithPrivateKey(seedKeyPair.privateKey);
    accessToken.signWithPrivateKey(clientKeyPair.privateKey);
    const response = await rpcClient.methods.nodesClaimNetworkVerify({
      signedTokenEncoded: accessToken.toEncoded(),
    });
    expect(response).toEqual({ success: true });
  });
});
