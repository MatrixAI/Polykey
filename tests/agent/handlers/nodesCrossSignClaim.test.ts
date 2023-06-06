import type * as quicEvents from '@matrixai/quic/dist/events';
import type { Host as QUICHost } from '@matrixai/quic';
import type NodeConnectionManager from '@/nodes/NodeConnectionManager';
import type Sigchain from '@/sigchain/Sigchain';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { QUICClient, QUICServer } from '@matrixai/quic';
import { DB } from '@matrixai/db';
import RPCClient from '@/rpc/RPCClient';
import RPCServer from '@/rpc/RPCServer';
import { nodesCrossSignClaim } from '@/agent/handlers/clientManifest';
import KeyRing from '@/keys/KeyRing';
import NodeGraph from '@/nodes/NodeGraph';
import { NodesCrossSignClaimHandler } from '@/agent/handlers/nodesCrossSignClaim';
import ACL from '@/acl/ACL';
import NodeManager from '@/nodes/NodeManager';
import GestaltGraph from '@/gestalts/GestaltGraph';
import TaskManager from '@/tasks/TaskManager';
import * as tlsTestsUtils from '../../utils/tls';

describe('nodesCrossSignClaim', () => {
  const logger = new Logger('nodesCrossSignClaim test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'password';
  const crypto = tlsTestsUtils.createCrypto();
  const localHost = '127.0.0.1' as QUICHost;

  let dataDir: string;

  let keyRing: KeyRing;
  let db: DB;
  let nodeGraph: NodeGraph;
  let rpcServer: RPCServer;
  let quicServer: QUICServer;

  const clientManifest = {
    nodesCrossSignClaim,
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
    });
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

    const acl = await ACL.createACL({
      db,
      logger,
    });
    const gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    const taskManager = await TaskManager.createTaskManager({
      db,
      logger,
    });
    const nodeManager = new NodeManager({
      db,
      keyRing,
      gestaltGraph,
      nodeConnectionManager: {} as NodeConnectionManager,
      nodeGraph: {} as NodeGraph,
      sigchain: {} as Sigchain,
      taskManager,
      logger,
    });
    await taskManager.startProcessing();

    // Setting up server
    const serverManifest = {
      nodesCrossSignClaim: new NodesCrossSignClaimHandler({
        acl,
        nodeManager,
      }),
    };
    rpcServer = await RPCServer.createRPCServer({
      manifest: serverManifest,
      logger,
    });
    const tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);
    quicServer = new QUICServer({
      config: {
        tlsConfig: {
          privKeyPem: tlsConfig.keyPrivatePem,
          certChainPem: tlsConfig.certChainPem,
        },
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
      conn.addEventListener('stream', handleStream);
      conn.addEventListener(
        'destroy',
        () => {
          conn.removeEventListener('stream', handleStream);
        },
        { once: true },
      );
    };
    quicServer.addEventListener('connection', handleConnection);
    quicServer.addEventListener(
      'stop',
      () => {
        quicServer.removeEventListener('connection', handleConnection);
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
    await nodeGraph.stop();
    await db.stop();
    await keyRing.stop();
  });

  test.todo('successfully cross signs a claim');
  test.todo('fails after receiving undefined singly signed claim');
  // Test('successfully cross signs a claim', async () => {
  //   const genClaims = rpcClient.methods.nodesCrossSignClaim();
  //   expect(genClaims.stream.destroyed).toBe(false);
  //   const claimId = claimsUtils.createClaimIdGenerator(localId)();
  //   const claimPayload: ClaimLinkNode = {
  //     typ: 'ClaimLinkNode',
  //     iss: nodesUtils.encodeNodeId(remoteId),
  //     sub: nodesUtils.encodeNodeId(localId),
  //     jti: claimsUtils.encodeClaimId(claimId),
  //     iat: 0,
  //     nbf: 0,
  //     seq: 0,
  //     prevDigest: null,
  //     prevClaimId: null,
  //   };
  //   const token = Token.fromPayload(claimPayload);
  //   token.signWithPrivateKey(remoteNode.keyRing.keyPair.privateKey);
  //   const claimMessage = nodesUtils.signedClaimToAgentClaimMessage(
  //     token.toSigned(),
  //   );
  //   await genClaims.write(claimMessage);
  //   // X reads this intermediary signed claim, and is expected to send back:
  //   // 1. Doubly signed claim
  //   // 2. Singly signed intermediary claim
  //   const response = await genClaims.read();
  //   // Check X's sigchain is locked at start
  //   expect(response.done).toBe(false);
  //   expect(response.value).toBeInstanceOf(nodesPB.AgentClaim);
  //   const receivedMessage = response.value as nodesPB.AgentClaim;
  //   const [, constructedDoubly] =
  //     nodesUtils.agentClaimMessageToSignedClaim(receivedMessage);
  //   const tokenDoubleClaim = Token.fromSigned(constructedDoubly);
  //   // Verify the doubly signed claim with both public keys
  //   expect(
  //     tokenDoubleClaim.verifyWithPublicKey(
  //       remoteNode.keyRing.keyPair.publicKey,
  //     ),
  //   ).toBeTrue();
  //   expect(
  //     tokenDoubleClaim.verifyWithPublicKey(pkAgent.keyRing.keyPair.publicKey),
  //   ).toBeTrue();
  //   // 4. X <- sends doubly signed claim (X's intermediary) <- Y
  //   const response2 = await genClaims.read();
  //   expect(response2.done).toBeFalse();
  //   expect(response2.value).toBeInstanceOf(nodesPB.AgentClaim);
  //   const receivedMessage2 = response2.value as nodesPB.AgentClaim;
  //   const [, constructedSingly] =
  //     nodesUtils.agentClaimMessageToSignedClaim(receivedMessage2);
  //   const tokenSingleClaim = Token.fromSigned(constructedSingly);
  //   tokenSingleClaim.signWithPrivateKey(remoteNode.keyRing.keyPair.privateKey);
  //   const claimSingleMessage = nodesUtils.signedClaimToAgentClaimMessage(
  //     tokenSingleClaim.toSigned(),
  //   );
  //   // Just before we complete the last step, check X's sigchain is still locked
  //   await genClaims.write(claimSingleMessage);
  //   // Expect the stream to be closed.
  //   const finalResponse = await genClaims.read();
  //   await genClaims.write(null);
  //   expect(finalResponse.done).toBe(true);
  //   expect(genClaims.stream.destroyed).toBe(true);
  //   // Check X's sigchain is released at end.
  //   // Check claim is in both node's sigchains
  //   // Rather, check it's in X's sigchain
  //   // Iterate just to be safe, but expected to only have this single claim
  //   for await (const [, claim] of pkAgent.sigchain.getClaims()) {
  //     expect(claim).toStrictEqual(tokenSingleClaim.payload);
  //   }
  // });
  // test('fails after receiving undefined singly signed claim', async () => {
  //   const genClaims = grpcClient.nodesCrossSignClaim();
  //   expect(genClaims.stream.destroyed).toBe(false);
  //   // 2. X <- sends its intermediary signed claim <- Y
  //   const crossSignMessageUndefinedSingly = new nodesPB.AgentClaim();
  //   await genClaims.write(crossSignMessageUndefinedSingly);
  //   await expect(() => genClaims.read()).rejects.toThrow(
  //     grpcErrors.ErrorPolykeyRemoteOLD,
  //   );
  //   expect(genClaims.stream.destroyed).toBe(true);
  // });
});
