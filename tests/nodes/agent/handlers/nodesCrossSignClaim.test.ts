import type NodeConnectionManager from '@/nodes/NodeConnectionManager';
import type { AgentClaimMessage } from '@/nodes/agent/types';
import type { NodeId } from '@/ids';
import type { ClaimLinkNode } from '@/claims/payloads';
import type { KeyPair } from '@/keys/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { QUICClient, QUICServer, events as quicEvents } from '@matrixai/quic';
import { DB } from '@matrixai/db';
import { RPCClient, RPCServer } from '@matrixai/rpc';
import Sigchain from '@/sigchain/Sigchain';
import KeyRing from '@/keys/KeyRing';
import NodeGraph from '@/nodes/NodeGraph';
import { nodesCrossSignClaim } from '@/nodes/agent/callers';
import NodesCrossSignClaim from '@/nodes/agent/handlers/NodesCrossSignClaim';
import ACL from '@/acl/ACL';
import NodeManager from '@/nodes/NodeManager';
import GestaltGraph from '@/gestalts/GestaltGraph';
import TaskManager from '@/tasks/TaskManager';
import * as keysUtils from '@/keys/utils';
import * as claimsUtils from '@/claims/utils';
import { Token } from '@/tokens';
import * as nodesUtils from '@/nodes/utils';
import { generateKeyPair } from '@/keys/utils/generate';
import * as networkUtils from '@/network/utils';
import * as tlsTestsUtils from '../../../utils/tls';

describe('nodesCrossSignClaim', () => {
  const logger = new Logger('nodesCrossSignClaim test', LogLevel.WARN, [
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
    nodesCrossSignClaim,
  };
  type ClientManifest = typeof clientManifest;
  let rpcClient: RPCClient<ClientManifest>;
  let quicClient: QUICClient;
  let clientKeyPair: KeyPair;
  let localNodeId: NodeId;

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
      nodesCrossSignClaim: new NodesCrossSignClaim({
        acl,
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
    clientKeyPair = generateKeyPair();
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
  test('successfully cross signs a claim', async () => {
    // Adding into the ACL
    await acl.setNodePerm(localNodeId, {
      gestalt: {
        claim: null,
        scan: null,
      },
      vaults: {},
    });
    const genClaims = await rpcClient.methods.nodesCrossSignClaim();
    const claimId = claimsUtils.createClaimIdGenerator(remoteNodeId)();
    const claimPayload: ClaimLinkNode = {
      typ: 'ClaimLinkNode',
      iss: nodesUtils.encodeNodeId(remoteNodeId),
      sub: nodesUtils.encodeNodeId(localNodeId),
      jti: claimsUtils.encodeClaimId(claimId),
      iat: 0,
      nbf: 0,
      seq: 0,
      prevDigest: null,
      prevClaimId: null,
    };
    const token = Token.fromPayload(claimPayload);
    token.signWithPrivateKey(clientKeyPair.privateKey);
    const agentClaimMessage: AgentClaimMessage = {
      signedTokenEncoded: claimsUtils.generateSignedClaim(token.toSigned()),
    };
    const writer = genClaims.writable.getWriter();
    await writer.write(agentClaimMessage);
    // X reads this intermediary signed claim, and is expected to send back:
    // 1. Doubly signed claim
    // 2. Singly signed intermediary claim
    const reader = genClaims.readable.getReader();
    const response = await reader.read();
    // Check X's sigchain is locked at start
    expect(response.done).toBe(false);
    const constructedDoubly = claimsUtils.parseSignedClaim(
      response.value!.signedTokenEncoded,
    );
    const tokenDoubleClaim = Token.fromSigned(constructedDoubly);
    // Verify the doubly signed claim with both public keys
    expect(
      tokenDoubleClaim.verifyWithPublicKey(keyRing.keyPair.publicKey),
    ).toBeTrue();
    expect(
      tokenDoubleClaim.verifyWithPublicKey(keyRing.keyPair.publicKey),
    ).toBeTrue();
    // 4. X <- sends doubly signed claim (X's intermediary) <- Y
    const response2 = await reader.read();
    expect(response2.done).toBeFalse();
    const constructedSingly = claimsUtils.parseSignedClaim(
      response2.value!.signedTokenEncoded,
    );
    const tokenSingleClaim = Token.fromSigned(constructedSingly);
    tokenSingleClaim.signWithPrivateKey(clientKeyPair.privateKey);
    // Just before we complete the last step, check X's sigchain is still locked
    await writer.write({
      signedTokenEncoded: claimsUtils.generateSignedClaim(
        tokenSingleClaim.toSigned(),
      ),
    });
    // Expect the stream to be closed.
    const finalResponse = await reader.read();
    await writer.close();
    expect(finalResponse.done).toBe(true);
    // Check X's sigchain is released at end.
    // Check claim is in both node's sigchains
    // Rather, check it's in X's sigchain
    // Iterate just to be safe, but expected to only have this single claim

    for await (const [, claim] of sigchain.getClaims()) {
      expect(claim).toStrictEqual(tokenSingleClaim.payload);
    }
  });
  test('fails after receiving undefined singly signed claim', async () => {
    const genClaims = await rpcClient.methods.nodesCrossSignClaim();
    const writer = genClaims.writable.getWriter();
    // 2. X <- sends its intermediary signed claim <- Y
    await writer.write({} as AgentClaimMessage);
    const reader = genClaims.readable.getReader();
    await expect(() => reader.read()).rejects.toThrow();
  });
});
