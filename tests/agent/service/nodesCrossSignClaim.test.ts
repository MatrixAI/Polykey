import type { ConnectionInfo, Host, Port } from '@/network/types';
import type { NodeId } from '@/ids/types';
import type { ClaimLinkNode } from '@/claims/payloads/index';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientAgent from '@/agent/GRPCClientAgent';
import nodesCrossSignClaim from '@/agent/service/nodesCrossSignClaim';
import { AgentServiceService } from '@/proto/js/polykey/v1/agent_service_grpc_pb';
import * as nodesPB from '@/proto/js/polykey/v1/nodes/nodes_pb';
import * as nodesUtils from '@/nodes/utils';
import * as claimsUtils from '@/claims/utils';
import * as grpcErrors from '@/grpc/errors';
import Token from '@/tokens/Token';
import * as testNodesUtils from '../../nodes/utils';
import * as keysUtils from '../../../src/keys/utils/index';

describe('nodesCrossSignClaim', () => {
  const logger = new Logger('nodesCrossSignClaim test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'hello-world';
  let dataDir: string;
  let nodePath: string;
  let grpcServer: GRPCServer;
  let grpcClient: GRPCClientAgent;
  let pkAgent: PolykeyAgent;
  let remoteNode: PolykeyAgent;
  let localId: NodeId;
  let remoteId: NodeId;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'keynode');
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      seedNodes: {}, // Explicitly no seed nodes on startup
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
      },
      keyRingConfig: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    localId = pkAgent.keyRing.getNodeId();
    // Setting up a remote keynode
    remoteNode = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: path.join(dataDir, 'remoteNode'),
      seedNodes: {}, // Explicitly no seed nodes on startup
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
      },
      keyRingConfig: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    remoteId = remoteNode.keyRing.getNodeId();
    await pkAgent.acl.setNodeAction(remoteId, 'claim');
    await testNodesUtils.nodesConnect(pkAgent, remoteNode);
    const agentService = {
      nodesCrossSignClaim: nodesCrossSignClaim({
        keyRing: pkAgent.keyRing,
        nodeManager: pkAgent.nodeManager,
        acl: pkAgent.acl,
        connectionInfoGet: () => {
          return { remoteNodeId: remoteId } as ConnectionInfo;
        },
        logger,
      }),
    };
    grpcServer = new GRPCServer({ logger });
    await grpcServer.start({
      services: [[AgentServiceService, agentService]],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
    });
    grpcClient = await GRPCClientAgent.createGRPCClientAgent({
      nodeId: pkAgent.keyRing.getNodeId(),
      host: '127.0.0.1' as Host,
      port: grpcServer.getPort(),
      logger,
    });
  }, globalThis.defaultTimeout);
  afterEach(async () => {
    await grpcClient.destroy();
    await grpcServer.stop();
    await pkAgent.stop();
    await remoteNode.stop();
    await remoteNode.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('successfully cross signs a claim', async () => {
    const genClaims = grpcClient.nodesCrossSignClaim();
    expect(genClaims.stream.destroyed).toBe(false);
    const claimId = claimsUtils.createClaimIdGenerator(localId)();
    const claimPayload: ClaimLinkNode = {
      typ: 'ClaimLinkNode',
      iss: nodesUtils.encodeNodeId(remoteId),
      sub: nodesUtils.encodeNodeId(localId),
      jti: claimsUtils.encodeClaimId(claimId),
      iat: 0,
      nbf: 0,
      seq: 0,
      prevDigest: null,
      prevClaimId: null,
    };
    const token = Token.fromPayload(claimPayload);
    token.signWithPrivateKey(remoteNode.keyRing.keyPair.privateKey);
    const claimMessage = nodesUtils.signedClaimToAgentClaimMessage(
      token.toSigned(),
    );
    await genClaims.write(claimMessage);
    // X reads this intermediary signed claim, and is expected to send back:
    // 1. Doubly signed claim
    // 2. Singly signed intermediary claim
    const response = await genClaims.read();
    // Check X's sigchain is locked at start
    expect(response.done).toBe(false);
    expect(response.value).toBeInstanceOf(nodesPB.AgentClaim);
    const receivedMessage = response.value as nodesPB.AgentClaim;
    const [, constructedDoubly] =
      nodesUtils.agentClaimMessageToSignedClaim(receivedMessage);
    const tokenDoubleClaim = Token.fromSigned(constructedDoubly);
    // Verify the doubly signed claim with both public keys
    expect(
      tokenDoubleClaim.verifyWithPublicKey(
        remoteNode.keyRing.keyPair.publicKey,
      ),
    ).toBeTrue();
    expect(
      tokenDoubleClaim.verifyWithPublicKey(pkAgent.keyRing.keyPair.publicKey),
    ).toBeTrue();
    // 4. X <- sends doubly signed claim (X's intermediary) <- Y
    const response2 = await genClaims.read();
    expect(response2.done).toBeFalse();
    expect(response2.value).toBeInstanceOf(nodesPB.AgentClaim);
    const receivedMessage2 = response2.value as nodesPB.AgentClaim;
    const [, constructedSingly] =
      nodesUtils.agentClaimMessageToSignedClaim(receivedMessage2);
    const tokenSingleClaim = Token.fromSigned(constructedSingly);
    tokenSingleClaim.signWithPrivateKey(remoteNode.keyRing.keyPair.privateKey);
    const claimSingleMessage = nodesUtils.signedClaimToAgentClaimMessage(
      tokenSingleClaim.toSigned(),
    );
    // Just before we complete the last step, check X's sigchain is still locked
    await genClaims.write(claimSingleMessage);
    // Expect the stream to be closed.
    const finalResponse = await genClaims.read();
    await genClaims.write(null);
    expect(finalResponse.done).toBe(true);
    expect(genClaims.stream.destroyed).toBe(true);
    // Check X's sigchain is released at end.
    // Check claim is in both node's sigchains
    // Rather, check it's in X's sigchain
    // Iterate just to be safe, but expected to only have this single claim
    for await (const [, claim] of pkAgent.sigchain.getClaims()) {
      expect(claim).toStrictEqual(tokenSingleClaim.payload);
    }
  });
  test('fails after receiving undefined singly signed claim', async () => {
    const genClaims = grpcClient.nodesCrossSignClaim();
    expect(genClaims.stream.destroyed).toBe(false);
    // 2. X <- sends its intermediary signed claim <- Y
    const crossSignMessageUndefinedSingly = new nodesPB.AgentClaim();
    await genClaims.write(crossSignMessageUndefinedSingly);
    await expect(() => genClaims.read()).rejects.toThrow(
      grpcErrors.ErrorPolykeyRemoteOLD,
    );
    expect(genClaims.stream.destroyed).toBe(true);
  });
});
