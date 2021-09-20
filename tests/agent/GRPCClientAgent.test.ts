import type { NodeAddress, NodeId, NodeInfo } from '@/nodes/types';
import type { ClaimId, ClaimIntermediary } from '@/claims/types';
import type { Host, Port, TLSConfig } from '@/network/types';

import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';

import { KeyManager } from '@/keys';
import { NodeManager } from '@/nodes';
import { VaultManager } from '@/vaults';
import { Sigchain } from '@/sigchain';
import { ACL } from '@/acl';
import { GestaltGraph } from '@/gestalts';
import { agentPB, GRPCClientAgent } from '@/agent';
import { ForwardProxy, ReverseProxy } from '@/network';
import { DB } from '@/db';
import { NotificationsManager } from '@/notifications';
import TestNodeConnection from '../nodes/TestNodeConnection';

import * as testUtils from './utils';
import { utils as claimsUtils, errors as claimsErrors } from '@/claims';

describe('GRPC agent', () => {
  const logger = new Logger('AgentServerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const node1: NodeInfo = {
    id: '12345' as NodeId,
    chain: {},
  };

  let client: GRPCClientAgent;
  let server: grpc.Server;
  let port: number;

  let dataDir: string;
  let keysPath: string;
  let vaultsPath: string;
  let dbPath: string;

  let keyManager: KeyManager;
  let vaultManager: VaultManager;
  let nodeManager: NodeManager;
  let sigchain: Sigchain;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let db: DB;
  let notificationsManager: NotificationsManager;

  let fwdProxy: ForwardProxy;
  let revProxy: ReverseProxy;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    keysPath = path.join(dataDir, 'keys');
    vaultsPath = path.join(dataDir, 'vaults');
    dbPath = path.join(dataDir, 'db');

    fwdProxy = new ForwardProxy({
      authToken: 'abc',
      logger: logger,
    });

    revProxy = new ReverseProxy({
      logger: logger,
    });

    keyManager = new KeyManager({
      keysPath,
      fs: fs,
      logger: logger,
    });

    db = new DB({
      dbPath: dbPath,
      fs: fs,
      logger: logger,
    });

    acl = new ACL({
      db: db,
      logger: logger,
    });

    gestaltGraph = new GestaltGraph({
      db: db,
      acl: acl,
      logger: logger,
    });

    sigchain = new Sigchain({
      keyManager: keyManager,
      db: db,
      logger: logger,
    });

    nodeManager = new NodeManager({
      db: db,
      sigchain: sigchain,
      keyManager: keyManager,
      fwdProxy: fwdProxy,
      revProxy: revProxy,
      fs: fs,
      logger: logger,
    });

    notificationsManager = new NotificationsManager({
      acl: acl,
      db: db,
      nodeManager: nodeManager,
      keyManager: keyManager,
      messageCap: 5,
      logger: logger,
    });

    vaultManager = new VaultManager({
      vaultsPath: vaultsPath,
      keyManager: keyManager,
      nodeManager: nodeManager,
      db: db,
      acl: acl,
      gestaltGraph: gestaltGraph,
      fs: fs,
      logger: logger,
    });

    await keyManager.start({ password: 'password' });
    await db.start({ keyPair: keyManager.getRootKeyPair() });
    const tlsConfig: TLSConfig = {
      keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
      certChainPem: await keyManager.getRootCertChainPem(),
    };
    await fwdProxy.start({ tlsConfig });
    await acl.start();
    await gestaltGraph.start();
    await nodeManager.start();
    await sigchain.start();
    await notificationsManager.start();
    await vaultManager.start({});
    [server, port] = await testUtils.openTestAgentServer({
      keyManager,
      vaultManager,
      nodeManager,
      sigchain,
      notificationsManager,
    });
    client = await testUtils.openTestAgentClient(port);
  }, global.polykeyStartupTimeout);
  afterEach(async () => {
    await testUtils.closeTestAgentClient(client);
    await testUtils.closeTestAgentServer(server);

    await vaultManager.stop();
    await notificationsManager.stop();
    await sigchain.stop();
    await nodeManager.stop();
    await gestaltGraph.stop();
    await acl.stop();
    await fwdProxy.stop();
    await db.stop();
    await keyManager.stop();

    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('echo', async () => {
    const echoMessage = new agentPB.EchoMessage();
    echoMessage.setChallenge('yes');
    await client.echo(echoMessage);
    const response = await client.echo(echoMessage);
    expect(response.getChallenge()).toBe('yes');
  });
  test('can check permissions', async () => {
    const vault = await vaultManager.createVault('TestAgentVault');
    await gestaltGraph.setNode(node1);
    await vaultManager.setVaultPermissions('12345' as NodeId, vault.vaultId);
    await vaultManager.unsetVaultPermissions('12345' as NodeId, vault.vaultId);
    const vaultPermMessage = new agentPB.VaultPermMessage();
    vaultPermMessage.setNodeId('12345');
    vaultPermMessage.setVaultId(vault.vaultId);
    const response = await client.vaultsPermisssionsCheck(vaultPermMessage);
    expect(response.getPermission()).toBeFalsy();
    await vaultManager.setVaultPermissions('12345' as NodeId, vault.vaultId);
    const response2 = await client.vaultsPermisssionsCheck(vaultPermMessage);
    expect(response2.getPermission()).toBeTruthy();
    await vaultManager.deleteVault(vault.vaultId);
  });
  test('can scan vaults', async () => {
    const vault = await vaultManager.createVault('TestAgentVault');
    await gestaltGraph.setNode(node1);
    const NodeIdMessage = new agentPB.NodeIdMessage();
    NodeIdMessage.setNodeId('12345');
    const response = client.vaultsScan(NodeIdMessage);
    const data: string[] = [];
    for await (const resp of response) {
      const chunk = resp.getVault_asU8();
      data.push(Buffer.from(chunk).toString());
    }
    expect(data).toStrictEqual([]);
    await vaultManager.setVaultPermissions('12345' as NodeId, vault.vaultId);
    const response2 = client.vaultsScan(NodeIdMessage);
    const data2: string[] = [];
    for await (const resp of response2) {
      const chunk = resp.getVault_asU8();
      data2.push(Buffer.from(chunk).toString());
    }
    expect(data2).toStrictEqual([`${vault.vaultName}\t${vault.vaultId}`]);
    await vaultManager.deleteVault(vault.vaultId);
  });
  test('Can connect over insecure connection.', async () => {
    const echoMessage = new agentPB.EchoMessage();
    echoMessage.setChallenge('yes');
    await client.echo(echoMessage);
    const response = await client.echo(echoMessage);
    expect(response.getChallenge()).toBe('yes');
    expect(client.secured).toBeFalsy();
  });
  describe('Cross signing claims', () => {
    // These tests follow the following process (from the perspective of X):
    // 1. X -> sends notification (to start cross signing request) -> Y
    // 2. X <- sends its intermediary signed claim <- Y
    // 3. X -> sends doubly signed claim (Y's intermediary) + its own intermediary claim -> Y
    // 4. X <- sends doubly signed claim (X's intermediary) <- Y
    // We mock the actions of Y (the client: NodeConnection) in the test cases,
    // and test the responses of X (the server: agentService).

    let yKeysPath: string;
    let yKeyManager: KeyManager;

    let xToYNodeConnection: TestNodeConnection;

    beforeEach(async () => {
      yKeysPath = path.join(dataDir, 'keys-y');
      yKeyManager = new KeyManager({ keysPath: yKeysPath, fs, logger });
      await yKeyManager.start({ password: 'password' });

      // Manually inject Y's public key into a dummy NodeConnection object, such
      // that it can be used to verify the claim signature
      xToYNodeConnection = new TestNodeConnection({
        publicKey: yKeyManager.getRootKeyPairPem().publicKey,
        targetNodeId: 'Y' as NodeId,
        targetHost: 'unnecessary' as Host,
        targetPort: 0 as Port,
        forwardProxy: fwdProxy,
        keyManager: keyManager,
      });
      // @ts-ignore - force push into the protected connections map
      nodeManager.connections.set('Y' as NodeId, xToYNodeConnection);
      await nodeManager.setNode(
        'Y' as NodeId,
        {
          ip: 'unnecessary' as Host,
          port: 0 as Port,
        } as NodeAddress,
      );
    });

    afterEach(async () => {
      await yKeyManager.stop();
    });

    test('can successfully cross sign a claim', async () => {
      const genClaims = client.nodesCrossSignClaim();
      expect(genClaims.stream.destroyed).toBe(false);
      // 2. X <- sends its intermediary signed claim <- Y
      // Create a dummy intermediary claim to "receive"
      const claim = await claimsUtils.createClaim({
        privateKey: yKeyManager.getRootKeyPairPem().privateKey,
        hPrev: null,
        seq: 1,
        data: {
          type: 'node',
          node1: 'Y' as NodeId,
          node2: 'X' as NodeId,
        },
        kid: 'Y' as NodeId,
      });
      const intermediary: ClaimIntermediary = {
        payload: claim.payload,
        signature: claim.signatures[0],
      };
      const crossSignMessage = claimsUtils.createCrossSignMessage({
        singlySignedClaim: intermediary,
      });
      await genClaims.write(crossSignMessage);

      // 3. X -> sends doubly signed claim (Y's intermediary) + its own intermediary claim -> Y
      // X reads this intermediary signed claim, and is expected to send back:
      // 1. Doubly signed claim
      // 2. Singly signed intermediary claim
      const response = await genClaims.read();
      // Check X's sigchain is locked at start
      expect(sigchain.locked).toBe(true);
      expect(response.done).toBe(false);
      expect(response.value).toBeInstanceOf(agentPB.CrossSignMessage);
      const receivedMessage = response.value as agentPB.CrossSignMessage;
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
        keyManager.getRootKeyPairPem().publicKey,
      );
      expect(verifiedSingly).toBe(true);
      // Verify the doubly signed claim with both public keys
      const verifiedDoubly =
        (await claimsUtils.verifyClaimSignature(
          constructedDoubly,
          yKeyManager.getRootKeyPairPem().publicKey,
        )) &&
        (await claimsUtils.verifyClaimSignature(
          constructedDoubly,
          keyManager.getRootKeyPairPem().publicKey,
        ));
      expect(verifiedDoubly).toBe(true);

      // 4. X <- sends doubly signed claim (X's intermediary) <- Y
      const doublyResponse = await claimsUtils.signIntermediaryClaim({
        claim: constructedIntermediary,
        privateKey: yKeyManager.getRootKeyPairPem().privateKey,
        signeeNodeId: 'Y' as NodeId,
      });
      const doublyMessage = claimsUtils.createCrossSignMessage({
        doublySignedClaim: doublyResponse,
      });
      // Just before we complete the last step, check X's sigchain is still locked
      expect(sigchain.locked).toBe(true);
      await genClaims.write(doublyMessage);

      // Expect the stream to be closed.
      const finalResponse = await genClaims.read();
      expect(finalResponse.done).toBe(true);
      expect(genClaims.stream.destroyed).toBe(true);

      // Check X's sigchain is released at end.
      expect(sigchain.locked).toBe(false);
      // Check claim is in both node's sigchains
      // Rather, check it's in X's sigchain
      const chain = await sigchain.getChainData();
      expect(Object.keys(chain).length).toBe(1);
      // Iterate just to be safe, but expected to only have this single claim
      for (const c of Object.keys(chain)) {
        const claimId = c as ClaimId;
        expect(chain[claimId]).toStrictEqual(doublyResponse);
      }
    });
    test('fails after receiving undefined singly signed claim', async () => {
      const genClaims = client.nodesCrossSignClaim();
      expect(genClaims.stream.destroyed).toBe(false);
      // 2. X <- sends its intermediary signed claim <- Y
      const crossSignMessageUndefinedSingly = new agentPB.CrossSignMessage();
      await genClaims.write(crossSignMessageUndefinedSingly);
      await expect(genClaims.read()).rejects.toThrow(
        claimsErrors.ErrorUndefinedSinglySignedClaim,
      );
      expect(genClaims.stream.destroyed).toBe(true);
      // Check sigchain's lock is released
      expect(sigchain.locked).toBe(false);
    });
    test('fails after receiving singly signed claim with no signature', async () => {
      const genClaims = client.nodesCrossSignClaim();
      expect(genClaims.stream.destroyed).toBe(false);
      // 2. X <- sends its intermediary signed claim <- Y
      const crossSignMessageUndefinedSinglySignature =
        new agentPB.CrossSignMessage();
      const intermediaryNoSignature = new agentPB.ClaimIntermediaryMessage();
      crossSignMessageUndefinedSinglySignature.setSinglySignedClaim(
        intermediaryNoSignature,
      );
      await genClaims.write(crossSignMessageUndefinedSinglySignature);
      await expect(genClaims.read()).rejects.toThrow(
        claimsErrors.ErrorUndefinedSignature,
      );
      expect(genClaims.stream.destroyed).toBe(true);
      // Check sigchain's lock is released
      expect(sigchain.locked).toBe(false);
    });
  });
});
