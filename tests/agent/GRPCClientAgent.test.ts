import type * as grpc from '@grpc/grpc-js';
import type { NodeAddress, NodeInfo } from '@/nodes/types';
import type { ClaimIdString, ClaimIntermediary } from '@/claims/types';
import type { Host, Port, TLSConfig } from '@/network/types';
import type { GRPCClientAgent } from '@/agent';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Mutex } from 'async-mutex';
import { DB } from '@matrixai/db';

import { KeyManager } from '@/keys';
import { NodeManager } from '@/nodes';
import { VaultManager } from '@/vaults';
import { Sigchain } from '@/sigchain';
import { ACL } from '@/acl';
import { GestaltGraph } from '@/gestalts';
import { errors as agentErrors } from '@/agent';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as vaultsPB from '@/proto/js/polykey/v1/vaults/vaults_pb';
import * as nodesPB from '@/proto/js/polykey/v1/nodes/nodes_pb';
import { ForwardProxy, ReverseProxy } from '@/network';
import { NotificationsManager } from '@/notifications';
import { utils as claimsUtils, errors as claimsErrors } from '@/claims';
import { makeNodeId } from '@/nodes/utils';
import * as testUtils from './utils';
import TestNodeConnection from '../nodes/TestNodeConnection';
import { makeCrypto } from '../utils';

// Mocks.
jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

describe('GRPC agent', () => {
  const password = 'password';
  const logger = new Logger('AgentServerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const node1: NodeInfo = {
    id: makeNodeId('v359vgrgmqf1r5g4fvisiddjknjko6bmm4qv7646jr7fi9enbfuug'),
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

    keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      fs: fs,
      logger: logger,
    });

    const tlsConfig: TLSConfig = {
      keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
      certChainPem: await keyManager.getRootCertChainPem(),
    };
    fwdProxy = new ForwardProxy({
      authToken: 'abc',
      logger: logger,
    });
    await fwdProxy.start({
      tlsConfig,
    });

    revProxy = new ReverseProxy({
      logger: logger,
    });

    db = await DB.createDB({
      dbPath: dbPath,
      fs: fs,
      logger: logger,
      crypto: makeCrypto(keyManager.dbKey),
    });

    acl = await ACL.createACL({
      db: db,
      logger: logger,
    });

    gestaltGraph = await GestaltGraph.createGestaltGraph({
      db: db,
      acl: acl,
      logger: logger,
    });

    sigchain = await Sigchain.createSigchain({
      keyManager: keyManager,
      db: db,
      logger: logger,
    });

    nodeManager = await NodeManager.createNodeManager({
      db: db,
      sigchain: sigchain,
      keyManager: keyManager,
      fwdProxy: fwdProxy,
      revProxy: revProxy,
      logger: logger,
    });

    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl: acl,
        db: db,
        nodeManager: nodeManager,
        keyManager: keyManager,
        messageCap: 5,
        logger: logger,
      });

    vaultManager = await VaultManager.createVaultManager({
      keyManager: keyManager,
      vaultsPath: vaultsPath,
      nodeManager: nodeManager,
      vaultsKey: keyManager.vaultKey,
      db: db,
      acl: acl,
      gestaltGraph: gestaltGraph,
      fs: fs,
      logger: logger,
    });

    await nodeManager.start();
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

  test('GRPCClientAgent readiness', async () => {
    await client.destroy();
    await expect(async () => {
      await client.echo(new utilsPB.EchoMessage());
    }).rejects.toThrow(agentErrors.ErrorAgentClientDestroyed);
  });
  test('echo', async () => {
    const echoMessage = new utilsPB.EchoMessage();
    echoMessage.setChallenge('yes');
    await client.echo(echoMessage);
    const response = await client.echo(echoMessage);
    expect(response.getChallenge()).toBe('yes');
  });
  test.skip('can check permissions', async () => {
    // FIXME: permissions not implemented on vaults.
    // const vault = await vaultManager.createVault('TestAgentVault' as VaultName);
    await gestaltGraph.setNode(node1);
    // Await vaultManager.setVaultPermissions('12345' as NodeId, vault.vaultId);
    // await vaultManager.unsetVaultPermissions('12345' as NodeId, vault.vaultId);
    const vaultPermMessage = new vaultsPB.NodePermission();
    vaultPermMessage.setNodeId(node1.id);
    // VaultPermMessage.setVaultId(vault.vaultId);
    const response = await client.vaultsPermisssionsCheck(vaultPermMessage);
    expect(response.getPermission()).toBeFalsy();
    // Await vaultManager.setVaultPermissions('12345' as NodeId, vault.vaultId);
    const response2 = await client.vaultsPermisssionsCheck(vaultPermMessage);
    expect(response2.getPermission()).toBeTruthy();
    // Await vaultManager.deleteVault(vault.vaultId);
  });
  test.skip('can scan vaults', async () => {
    // FIXME, permissions not implemented on vaults
    // const vault = await vaultManager.createVault('TestAgentVault' as VaultName);
    await gestaltGraph.setNode(node1);
    const nodeIdMessage = new nodesPB.Node();
    nodeIdMessage.setNodeId(node1.id);
    const response = client.vaultsScan(nodeIdMessage);
    const data: string[] = [];
    for await (const resp of response) {
      const chunk = resp.getNameOrId();
      data.push(Buffer.from(chunk).toString());
    }
    expect(data).toStrictEqual([]);
    fail();
    // Await vaultManager.setVaultPermissions('12345' as NodeId, vault.vaultId);
    // const response2 = client.vaultsScan(nodeIdMessage);
    // Const data2: string[] = [];
    // for await (const resp of response2) {
    // Const chunk = resp.getNameOrId();
    // Data2.push(Buffer.from(chunk).toString());
    // }
    // Expect(data2).toStrictEqual([`${vault.vaultName}\t${vault.vaultId}`]);
    // await vaultManager.deleteVault(vault.vaultId);
  });
  test('Can connect over insecure connection.', async () => {
    const echoMessage = new utilsPB.EchoMessage();
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

    const nodeIdX = makeNodeId(
      'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0',
    );
    const nodeIdY = makeNodeId(
      'vrcacp9vsb4ht25hds6s4lpp2abfaso0mptcfnh499n35vfcn2gkg',
    );

    beforeEach(async () => {
      yKeysPath = path.join(dataDir, 'keys-y');
      yKeyManager = await KeyManager.createKeyManager({
        password,
        keysPath: yKeysPath,
        fs,
        logger,
      });

      // Manually inject Y's public key into a dummy NodeConnection object, such
      // that it can be used to verify the claim signature
      xToYNodeConnection = await TestNodeConnection.createTestNodeConnection({
        publicKey: yKeyManager.getRootKeyPairPem().publicKey,
        targetNodeId: nodeIdY,
        targetHost: 'unnecessary' as Host,
        targetPort: 0 as Port,
        forwardProxy: fwdProxy,
        keyManager: keyManager,
        logger: logger,
      });
      // @ts-ignore - force push into the protected connections map
      nodeManager.connections.set(nodeIdY, {
        connection: xToYNodeConnection,
        lock: new Mutex(),
      });
      await nodeManager.setNode(nodeIdY, {
        host: 'unnecessary' as Host,
        port: 0 as Port,
      } as NodeAddress);
    });

    afterEach(async () => {
      await yKeyManager.stop();
      await yKeyManager.destroy();
    });

    test(
      'can successfully cross sign a claim',
      async () => {
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
            node1: nodeIdY,
            node2: nodeIdX,
          },
          kid: nodeIdY,
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
        expect(response.value).toBeInstanceOf(nodesPB.CrossSign);
        const receivedMessage = response.value as nodesPB.CrossSign;
        expect(receivedMessage.getSinglySignedClaim()).toBeDefined();
        expect(receivedMessage.getDoublySignedClaim()).toBeDefined();
        const constructedIntermediary =
          claimsUtils.reconstructClaimIntermediary(
            receivedMessage.getSinglySignedClaim()!,
          );
        const constructedDoubly = claimsUtils.reconstructClaimEncoded(
          receivedMessage.getDoublySignedClaim()!,
        );
        // Verify the intermediary claim with X's public key
        const verifiedSingly =
          await claimsUtils.verifyIntermediaryClaimSignature(
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
          signeeNodeId: nodeIdY,
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
          const claimId = c as ClaimIdString;
          expect(chain[claimId]).toStrictEqual(doublyResponse);
        }
      },
      global.defaultTimeout * 4,
    );
    test(
      'fails after receiving undefined singly signed claim',
      async () => {
        const genClaims = client.nodesCrossSignClaim();
        expect(genClaims.stream.destroyed).toBe(false);
        // 2. X <- sends its intermediary signed claim <- Y
        const crossSignMessageUndefinedSingly = new nodesPB.CrossSign();
        await genClaims.write(crossSignMessageUndefinedSingly);
        await expect(() => genClaims.read()).rejects.toThrow(
          claimsErrors.ErrorUndefinedSinglySignedClaim,
        );
        expect(genClaims.stream.destroyed).toBe(true);
        // Check sigchain's lock is released
        expect(sigchain.locked).toBe(false);
      },
      global.defaultTimeout * 4,
    );
    test(
      'fails after receiving singly signed claim with no signature',
      async () => {
        const genClaims = client.nodesCrossSignClaim();
        expect(genClaims.stream.destroyed).toBe(false);
        // 2. X <- sends its intermediary signed claim <- Y
        const crossSignMessageUndefinedSinglySignature =
          new nodesPB.CrossSign();
        const intermediaryNoSignature = new nodesPB.ClaimIntermediary();
        crossSignMessageUndefinedSinglySignature.setSinglySignedClaim(
          intermediaryNoSignature,
        );
        await genClaims.write(crossSignMessageUndefinedSinglySignature);
        await expect(() => genClaims.read()).rejects.toThrow(
          claimsErrors.ErrorUndefinedSignature,
        );
        expect(genClaims.stream.destroyed).toBe(true);
        // Check sigchain's lock is released
        expect(sigchain.locked).toBe(false);
      },
      global.defaultTimeout * 4,
    );
  });
});
