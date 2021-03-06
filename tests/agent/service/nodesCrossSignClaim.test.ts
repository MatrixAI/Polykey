import type { ClaimIdString, ClaimIntermediary } from '@/claims/types';
import type { Host, Port } from '@/network/types';
import type { NodeId } from '@/nodes/types';
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
import * as keysUtils from '@/keys/utils';
import * as nodesUtils from '@/nodes/utils';
import * as claimsUtils from '@/claims/utils';
import * as grpcErrors from '@/grpc/errors';
import * as testNodesUtils from '../../nodes/utils';
import * as testUtils from '../../utils';

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
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValueOnce(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValueOnce(globalKeyPair);
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'keynode');
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      keysConfig: {
        rootKeyPairBits: 2048,
      },
      seedNodes: {}, // Explicitly no seed nodes on startup
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
      },
      logger,
    });
    localId = pkAgent.keyManager.getNodeId();
    // Setting up a remote keynode
    remoteNode = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: path.join(dataDir, 'remoteNode'),
      keysConfig: {
        rootKeyPairBits: 2048,
      },
      seedNodes: {}, // Explicitly no seed nodes on startup
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
      },
      logger,
    });
    remoteId = remoteNode.keyManager.getNodeId();
    await testNodesUtils.nodesConnect(pkAgent, remoteNode);
    const agentService = {
      nodesCrossSignClaim: nodesCrossSignClaim({
        keyManager: pkAgent.keyManager,
        nodeManager: pkAgent.nodeManager,
        sigchain: pkAgent.sigchain,
        db: pkAgent.db,
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
      nodeId: pkAgent.keyManager.getNodeId(),
      host: '127.0.0.1' as Host,
      port: grpcServer.getPort(),
      logger,
    });
  }, global.defaultTimeout);
  afterAll(async () => {
    await grpcClient.destroy();
    await grpcServer.stop();
    await pkAgent.stop();
    await pkAgent.destroy();
    await remoteNode.stop();
    await remoteNode.destroy();
    await remoteNode.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
  });
  test('successfully cross signs a claim', async () => {
    const genClaims = grpcClient.nodesCrossSignClaim();
    expect(genClaims.stream.destroyed).toBe(false);
    // Create a dummy intermediary claim to "receive"
    const claim = await claimsUtils.createClaim({
      privateKey: remoteNode.keyManager.getRootKeyPairPem().privateKey,
      hPrev: null,
      seq: 1,
      data: {
        type: 'node',
        node1: nodesUtils.encodeNodeId(remoteId),
        node2: nodesUtils.encodeNodeId(localId),
      },
      kid: nodesUtils.encodeNodeId(remoteId),
    });
    const intermediary: ClaimIntermediary = {
      payload: claim.payload,
      signature: claim.signatures[0],
    };
    const crossSignMessage = claimsUtils.createCrossSignMessage({
      singlySignedClaim: intermediary,
    });
    await genClaims.write(crossSignMessage);
    // X reads this intermediary signed claim, and is expected to send back:
    // 1. Doubly signed claim
    // 2. Singly signed intermediary claim
    const response = await genClaims.read();
    // Check X's sigchain is locked at start
    expect(response.done).toBe(false);
    expect(response.value).toBeInstanceOf(nodesPB.CrossSign);
    const receivedMessage = response.value as nodesPB.CrossSign;
    expect(receivedMessage.getSinglySignedClaim()).toBeDefined();
    expect(receivedMessage.getDoublySignedClaim()).toBeDefined();
    const constructedIntermediary = claimsUtils.reconstructClaimIntermediary(
      receivedMessage.getSinglySignedClaim()!,
    );
    const constructedDoubly = claimsUtils.reconstructClaimEncoded(
      receivedMessage.getDoublySignedClaim()!,
    );
    // Verify the intermediary claim with X's public key
    const verifiedSingly = await claimsUtils.verifyIntermediaryClaimSignature(
      constructedIntermediary,
      pkAgent.keyManager.getRootKeyPairPem().publicKey,
    );
    expect(verifiedSingly).toBe(true);
    // Verify the doubly signed claim with both public keys
    const verifiedDoubly =
      (await claimsUtils.verifyClaimSignature(
        constructedDoubly,
        remoteNode.keyManager.getRootKeyPairPem().publicKey,
      )) &&
      (await claimsUtils.verifyClaimSignature(
        constructedDoubly,
        pkAgent.keyManager.getRootKeyPairPem().publicKey,
      ));
    expect(verifiedDoubly).toBe(true);
    // 4. X <- sends doubly signed claim (X's intermediary) <- Y
    const doublyResponse = await claimsUtils.signIntermediaryClaim({
      claim: constructedIntermediary,
      privateKey: remoteNode.keyManager.getRootKeyPairPem().privateKey,
      signeeNodeId: nodesUtils.encodeNodeId(remoteId),
    });
    const doublyMessage = claimsUtils.createCrossSignMessage({
      doublySignedClaim: doublyResponse,
    });
    // Just before we complete the last step, check X's sigchain is still locked
    await genClaims.write(doublyMessage);
    // Expect the stream to be closed.
    const finalResponse = await genClaims.read();
    expect(finalResponse.done).toBe(true);
    expect(genClaims.stream.destroyed).toBe(true);
    // Check X's sigchain is released at end.
    // Check claim is in both node's sigchains
    // Rather, check it's in X's sigchain
    const chain = await pkAgent.sigchain.getChainData();
    expect(Object.keys(chain).length).toBe(1);
    // Iterate just to be safe, but expected to only have this single claim
    for (const c of Object.keys(chain)) {
      const claimId = c as ClaimIdString;
      expect(chain[claimId]).toStrictEqual(doublyResponse);
    }
    // Revert side effects
    await pkAgent.sigchain.stop();
    await pkAgent.sigchain.destroy();
    await remoteNode.sigchain.stop();
    await remoteNode.sigchain.destroy();
  });
  test('fails after receiving undefined singly signed claim', async () => {
    const genClaims = grpcClient.nodesCrossSignClaim();
    expect(genClaims.stream.destroyed).toBe(false);
    // 2. X <- sends its intermediary signed claim <- Y
    const crossSignMessageUndefinedSingly = new nodesPB.CrossSign();
    await genClaims.write(crossSignMessageUndefinedSingly);
    await expect(() => genClaims.read()).rejects.toThrow(
      grpcErrors.ErrorPolykeyRemote,
    );
    expect(genClaims.stream.destroyed).toBe(true);
    // Check sigchain's lock is released
    // Revert side effects
    await pkAgent.sigchain.stop();
    await pkAgent.sigchain.destroy();
    await remoteNode.sigchain.stop();
    await remoteNode.sigchain.destroy();
  });
  test('fails after receiving singly signed claim with no signature', async () => {
    const genClaims = grpcClient.nodesCrossSignClaim();
    expect(genClaims.stream.destroyed).toBe(false);
    // 2. X <- sends its intermediary signed claim <- Y
    const crossSignMessageUndefinedSinglySignature = new nodesPB.CrossSign();
    const intermediaryNoSignature = new nodesPB.ClaimIntermediary();
    crossSignMessageUndefinedSinglySignature.setSinglySignedClaim(
      intermediaryNoSignature,
    );
    await genClaims.write(crossSignMessageUndefinedSinglySignature);
    await expect(() => genClaims.read()).rejects.toThrow(
      grpcErrors.ErrorPolykeyRemote,
    );
    expect(genClaims.stream.destroyed).toBe(true);
    // Check sigchain's lock is released
    // Revert side effects
    await pkAgent.sigchain.stop();
    await pkAgent.sigchain.destroy();
    await remoteNode.sigchain.stop();
    await remoteNode.sigchain.destroy();
  });
});
