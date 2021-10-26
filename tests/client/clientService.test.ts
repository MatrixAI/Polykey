import type { Host, Port, TLSConfig } from '@/network/types';
import type { NodeInfo, NodeAddress } from '@/nodes/types';
import type { SessionToken, SessionCredentials } from '@/sessions/types';
import type { IdentityId, IdentityInfo, ProviderId } from '@/identities/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';

import TestProvider from '../identities/TestProvider';
import { PolykeyAgent, PolykeyClient } from '@';
import { messages } from '@/client';
import { NodeManager } from '@/nodes';
import { GestaltGraph } from '@/gestalts';
import { VaultManager } from '@/vaults';
import { IdentitiesManager } from '@/identities';
import { KeyManager } from '@/keys';
import { ForwardProxy } from '@/network';
import { ClientClient } from '@/proto/js/Client_grpc_pb';

import * as testKeynodeUtils from '../utils';
import * as testUtils from './utils';
import * as grpcUtils from '@/grpc/utils';
import * as gestaltsUtils from '@/gestalts/utils';
import * as polykeyErrors from '@/errors';
import * as vaultErrors from '@/vaults/errors';
import * as nodesErrors from '@/nodes/errors';
import * as agentUtils from '@/agent/utils';
import { sleep } from '@/utils';
import { ErrorSessionTokenInvalid } from '@/errors';
import { checkAgentRunning } from '@/agent/utils';
import { NotificationData } from '@/notifications/types';
import { makeNodeId } from '@/nodes/utils';
import { Vault, VaultName } from '@/vaults/types';
import { vaultOps } from '@/vaults';
import { makeVaultId, makeVaultIdPretty } from '@/vaults/utils';
import { utils as idUtils } from '@matrixai/id';

/**
 * This test file has been optimised to use only one instance of PolykeyAgent where posible.
 * Setting up the PolykeyAgent has been done in a beforeAll block.
 * Keep this in mind when adding or editing tests.
 * Any side effects need to be undone when the test has completed.
 * Preferably within a `afterEach()` since any cleanup will be skipped inside a failing test.
 *
 * - left over state can cause a test to fail in certain cases.
 * - left over state can cause similar tests to succeed when they should fail.
 * - starting or stopping the agent within tests should be done on a new instance of the polykey agent.
 * - when in doubt test each modified or added test on it's own as well as the whole file.
 * - Looking into adding a way to safely clear each domain's DB information with out breaking modules.
 */
describe('Client service', () => {
  const password = 'password';
  const logger = new Logger('ClientServerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let client: ClientClient;
  let server: grpc.Server;
  let port: number;

  let dataDir: string;

  let polykeyAgent: PolykeyAgent;
  let keyManager: KeyManager;
  let nodeManager: NodeManager;
  let vaultManager: VaultManager;
  let gestaltGraph: GestaltGraph;
  let identitiesManager: IdentitiesManager;

  let passwordFile: string;

  let fwdProxy: ForwardProxy;

  let callCredentials: SessionCredentials;

  //Node and identity infos.
  const nodeId1 = makeNodeId(
    'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0',
  );
  const nodeId2 = makeNodeId(
    'vrcacp9vsb4ht25hds6s4lpp2abfaso0mptcfnh499n35vfcn2gkg',
  );
  const nodeId3 = makeNodeId(
    'v359vgrgmqf1r5g4fvisiddjknjko6bmm4qv7646jr7fi9enbfuug',
  );
  const nodeId4 = makeNodeId(
    'vm5guqfrrhlrsa70qpauen8jd0lmb0v6j8r8c94p34n738vlvu7vg',
  );
  const nodeId5 = makeNodeId(
    'vlm1hn7hcs6pqdmhk6fnehvfkn1ee5ta8md0610onr7e75r737l3g',
  );
  const dummyNode = makeNodeId(
    'vi3et1hrpv2m2lrplcm7cu913kr45v51cak54vm68anlbvuf83ra0',
  );

  const testToken = {
    providerId: 'test-provider' as ProviderId,
    identityId: 'test_user' as IdentityId,
    tokenData: {
      accessToken: 'abc123',
    },
  };
  const node2: NodeInfo = {
    id: nodeId2,
    chain: {},
  };
  const identity1: IdentityInfo = {
    providerId: 'github.com' as ProviderId,
    identityId: 'IdentityIdABC' as IdentityId,
    claims: {},
  };
  let node1: NodeInfo;

  async function createGestaltState() {
    await gestaltGraph.setNode(node1);
    await gestaltGraph.setNode(node2);
    await gestaltGraph.setIdentity(identity1);
    await gestaltGraph.linkNodeAndIdentity(node2, identity1);
  }

  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );

    passwordFile = path.join(dataDir, 'password');
    await fs.promises.writeFile(passwordFile, 'password');

    fwdProxy = await ForwardProxy.createForwardProxy({
      authToken: 'abc',
      logger: logger,
    });

    polykeyAgent = await PolykeyAgent.createPolykey({
      password,
      nodePath: dataDir,
      logger,
      fwdProxy,
      cores: 1,
      workerManager: null,
    });

    await polykeyAgent.start({});
    keyManager = polykeyAgent.keys;
    nodeManager = polykeyAgent.nodes;
    vaultManager = polykeyAgent.vaults;
    gestaltGraph = polykeyAgent.gestalts;
    identitiesManager = polykeyAgent.identities;

    //Adding provider.
    const testProvider = new TestProvider();
    identitiesManager.registerProvider(testProvider);

    [server, port] = await testUtils.openTestClientServer({
      polykeyAgent,
      secure: false,
    });

    client = await testUtils.openSimpleClientClient(port);

    //Filling in infos.
    node1 = {
      id: nodeManager.getNodeId(),
      chain: {},
    };
  }, global.polykeyStartupTimeout);
  afterAll(async () => {
    await testUtils.closeTestClientServer(server);
    testUtils.closeSimpleClientClient(client);

    await polykeyAgent.stop();
    await polykeyAgent.destroy();

    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    await fs.promises.rm(passwordFile);
  });
  beforeEach(async () => {
    const sessionToken = await polykeyAgent.sessions.generateToken();
    callCredentials = testUtils.createCallCredentials(sessionToken);
  });
  afterEach(async () => {
    await gestaltGraph.clearDB();
  });

  test('can echo', async () => {
    const echo = grpcUtils.promisifyUnaryCall<messages.EchoMessage>(
      client,
      client.echo,
    );
    const m = new messages.EchoMessage();
    m.setChallenge('Hello');
    const res: messages.EchoMessage = await echo(m, callCredentials);
    expect(res.getChallenge()).toBe('Hello');

    // Hard Coded error
    m.setChallenge('ThrowAnError');
    await expect(() => echo(m)).rejects.toThrow(polykeyErrors.ErrorPolykey);
  });
  describe('sessions', () => {
    test('can request a session', async () => {
      const requestJWT = grpcUtils.promisifyUnaryCall<messages.sessions.Token>(
        client,
        client.sessionUnlock,
      );

      const passwordMessage = new messages.sessions.Password();
      passwordMessage.setPasswordFile(passwordFile);

      const res = await requestJWT(passwordMessage);
      expect(typeof res.getToken()).toBe('string');
      const result = await polykeyAgent.sessions.verifyToken(
        res.getToken() as SessionToken,
      );
      expect(result).toBeTruthy();
    });
    test('can refresh session', async () => {
      const requestJWT = grpcUtils.promisifyUnaryCall<messages.sessions.Token>(
        client,
        client.sessionUnlock,
      );

      const passwordMessage = new messages.sessions.Password();
      passwordMessage.setPasswordFile(passwordFile);

      const res1 = await requestJWT(passwordMessage);
      const token1 = res1.getToken() as SessionToken;
      const callCredentialsRefresh = testUtils.createCallCredentials(token1);

      const sessionRefresh =
        grpcUtils.promisifyUnaryCall<messages.sessions.Token>(
          client,
          client.sessionRefresh,
        );

      const emptyMessage = new messages.EmptyMessage();

      const res2 = await sessionRefresh(emptyMessage, callCredentialsRefresh);
      expect(typeof res2.getToken()).toBe('string');
      const token2 = res2.getToken() as SessionToken;
      const result = await polykeyAgent.sessions.verifyToken(token2);
      expect(result).toBeTruthy();
      expect(token1).not.toEqual(token2);
    });
    test.todo('actions over GRPC refresh the session'); // How do I even test this?
    test('session can lock all', async () => {
      //Starts off unlocked.

      const echo = grpcUtils.promisifyUnaryCall<messages.EchoMessage>(
        client,
        client.echo,
      );

      // Checking that session is working.
      const echoMessage = new messages.EchoMessage();
      echoMessage.setChallenge('Hello');
      const res = await echo(echoMessage, callCredentials);
      expect(res.getChallenge()).toBe('Hello');

      //Locking the session.
      const sessionLockAll = grpcUtils.promisifyUnaryCall<messages.EchoMessage>(
        client,
        client.sessionLockAll,
      );

      const emptyMessage = new messages.EmptyMessage();
      await sessionLockAll(emptyMessage, callCredentials);

      //Should reject the session token.
      await expect(() => echo(echoMessage, callCredentials)).rejects.toThrow(
        ErrorSessionTokenInvalid,
      );
    });
  });
  describe('agent', () => {
    test(
      'stop',
      async () => {
        //Starting agent
        const newNodePath = path.join(dataDir, 'newAgent');
        const agent = await PolykeyAgent.createPolykey({
          password,
          nodePath: newNodePath,
          logger,
          cores: 1,
          workerManager: null,
        });

        await agent.start({});
        const token = await agent.sessions.generateToken();

        const newClient = await PolykeyClient.createPolykeyClient({
          nodePath: newNodePath,
          logger,
        });
        await newClient.start({});
        await newClient.session.start({ token });

        const emptyMessage = new messages.EmptyMessage();
        await newClient.grpcClient.agentStop(emptyMessage);
        await sleep(10000);

        expect(await agentUtils.checkAgentRunning(newNodePath)).toBeFalsy();
        await newClient.stop();
      },
      global.polykeyStartupTimeout + 10000,
    );
  });
  describe('vaults', () => {
    afterEach(async () => {
      const aliveVaults = await vaultManager.listVaults();
      for (const vaultId of aliveVaults.values()) {
        await vaultManager.destroyVault(vaultId);
      }
    });

    test('should get vaults', async () => {
      const listVaults =
        grpcUtils.promisifyReadableStreamCall<messages.vaults.List>(
          client,
          client.vaultsList,
        );

      const vaultList = ['Vault1', 'Vault2', 'Vault3', 'Vault4', 'Vault5'];

      for (const vaultName of vaultList) {
        await vaultManager.createVault(vaultName as VaultName);
      }

      const emptyMessage = new messages.EmptyMessage();
      const res = await listVaults(emptyMessage, callCredentials);
      const names: Array<string> = [];
      for await (const val of res) {
        names.push(val.getVaultName());
      }

      expect(names.sort()).toStrictEqual(vaultList.sort());
    });
    test('should create vault', async () => {
      const vaultName = 'NewVault' as VaultName;

      const createVault = grpcUtils.promisifyUnaryCall<messages.vaults.Vault>(
        client,
        client.vaultsCreate,
      );

      const vaultMessage = new messages.vaults.Vault();
      vaultMessage.setNameOrId(vaultName);

      const vaultId = await createVault(vaultMessage, callCredentials);
      const vaultList = await vaultManager.listVaults();
      expect(vaultList.get(vaultName)).toBeTruthy();
      expect(vaultList.get(vaultName)).toStrictEqual(
        makeVaultId(vaultId.getNameOrId()),
      );
    });
    test('should delete vaults', async () => {
      const deleteVault = grpcUtils.promisifyUnaryCall<messages.StatusMessage>(
        client,
        client.vaultsDelete,
      );

      const vaultList = ['Vault1', 'Vault2', 'Vault3', 'Vault4', 'Vault5'];
      const vaultList2 = ['Vault2', 'Vault3', 'Vault4', 'Vault5'];

      const vaults: Array<Vault> = [];

      for (const vaultName of vaultList) {
        vaults.push(await vaultManager.createVault(vaultName as VaultName));
      }

      const vaultMessage = new messages.vaults.Vault();
      vaultMessage.setNameOrId(vaultList[0]);

      const res = await deleteVault(vaultMessage, callCredentials);
      expect(res.getSuccess()).toBe(true);

      const list: Array<string> = [];
      const listVaults = await vaultManager.listVaults();
      for (const [vaultName] of listVaults) {
        list.push(vaultName);
      }
      expect(list.sort()).toStrictEqual(vaultList2.sort());

      await expect(deleteVault(vaultMessage, callCredentials)).rejects.toThrow(
        vaultErrors.ErrorVaultUndefined,
      );
    });
    test('should rename vaults', async () => {
      const vaultName = 'MyFirstVault' as VaultName;
      const vaultRename = 'MyRenamedVault' as VaultName;
      const renameVault = grpcUtils.promisifyUnaryCall<messages.vaults.Vault>(
        client,
        client.vaultsRename,
      );

      const vault = await vaultManager.createVault(vaultName);

      const vaultRenameMessage = new messages.vaults.Rename();
      const vaultMessage = new messages.vaults.Vault();
      vaultMessage.setNameOrId(makeVaultIdPretty(vault.vaultId));
      vaultRenameMessage.setVault(vaultMessage);
      vaultRenameMessage.setNewName(vaultRename);

      const vaultId = await renameVault(vaultRenameMessage, callCredentials);
      expect(makeVaultId(vaultId.getNameOrId())).toStrictEqual(vault.vaultId);

      const name = (await vaultManager.listVaults()).entries().next().value[0];
      expect(name).toBe(vaultRename);
    });
    //FIXME, fix this when vault secrets stat is re-implemented
    test.skip('should get stats for vaults', async () => {
      fail('not implemented');
      const statsVault = grpcUtils.promisifyUnaryCall<messages.vaults.Stat>(
        client,
        client.vaultsSecretsStat,
      );

      const vault = await vaultManager.createVault('MyFirstVault' as VaultName);
      const vault2 = await vaultManager.createVault(
        'MySecondVault' as VaultName,
      );

      const vaultMessage = new messages.vaults.Vault();
      vaultMessage.setNameOrId(makeVaultIdPretty(vault.vaultId));

      const res = await statsVault(vaultMessage, callCredentials);
      const stats1 = res.getStats();

      vaultMessage.setNameOrId(makeVaultIdPretty(vault.vaultId));
      const res2 = await statsVault(vaultMessage, callCredentials);
      const stats2 = res2.getStats();

      // FIXME
      // expect(stats1).toBe(
      //   JSON.stringify(await vaultManager.vaultStats(vault.vaultId)),
      // );
      // expect(stats2).toBe(
      //   JSON.stringify(await vaultManager.vaultStats(vault2.vaultId)),
      // );
    });
    test('should make a directory in a vault', async () => {
      const vaultName = 'MySecondVault' as VaultName;

      const mkdirVault = grpcUtils.promisifyUnaryCall<messages.EmptyMessage>(
        client,
        client.vaultsSecretsMkdir,
      );

      const vault = await vaultManager.createVault(vaultName);
      const dirPath = 'dir/dir1/dir2';

      const vaultMkdirMessage = new messages.vaults.Mkdir();
      const vaultMessage = new messages.vaults.Vault();
      vaultMessage.setNameOrId(makeVaultIdPretty(vault.vaultId));
      vaultMkdirMessage.setVault(vaultMessage);
      vaultMkdirMessage.setDirName(dirPath);
      vaultMkdirMessage.setRecursive(true);

      await mkdirVault(vaultMkdirMessage, callCredentials);

      await vault.access(async (efs) => {
        expect(await efs.exists(dirPath)).toBeTruthy();
      });
    });
    test('should list secrets in a vault', async () => {
      const vaultName = 'MyFirstVault' as VaultName;
      const listSecretsVault =
        grpcUtils.promisifyReadableStreamCall<messages.secrets.Secret>(
          client,
          client.vaultsSecretsList,
        );

      const vault = await vaultManager.createVault(vaultName);

      const secretList = [
        'Secret1',
        'Secret2',
        'Secret3',
        'Secret4',
        'Secret5',
      ];

      await vault.commit(async (efs) => {
        for (const secretName of secretList) {
          await efs.writeFile(secretName, secretName);
        }
      });

      const vaultMessage = new messages.vaults.Vault();
      vaultMessage.setNameOrId(makeVaultIdPretty(vault.vaultId));

      const res = await listSecretsVault(vaultMessage, callCredentials);

      const names: Array<string> = [];
      for await (const val of res) {
        names.push(val.getSecretName());
      }

      expect(names.sort()).toStrictEqual(secretList.sort());
    });
    test('should delete secrets in a vault', async () => {
      const vaultName = 'MyFirstVault' as VaultName;
      const deleteSecretVault =
        grpcUtils.promisifyUnaryCall<messages.StatusMessage>(
          client,
          client.vaultsSecretsDelete,
        );

      const vault = await vaultManager.createVault(vaultName);

      const secretList = [
        'Secret1',
        'Secret2',
        'Secret3',
        'Secret4',
        'Secret5',
      ];
      const secretList2 = ['Secret2', 'Secret3', 'Secret4', 'Secret5'];

      await vault.commit(async (efs) => {
        for (const secretName of secretList) {
          await efs.writeFile(secretName, secretName);
        }
      });

      const secretMessage = new messages.secrets.Secret();
      const vaultMessage = new messages.vaults.Vault();
      vaultMessage.setNameOrId(makeVaultIdPretty(vault.vaultId));
      secretMessage.setVault(vaultMessage);
      secretMessage.setSecretName('Secret1');

      const res = await deleteSecretVault(secretMessage, callCredentials);
      expect(res.getSuccess()).toBeTruthy();

      const secrets = await vault.access(async (efs) => {
        return await efs.readdir('.');
      });
      expect(secrets).toEqual(secretList2); // FIXME, this will likely fail.
    });
    test('should edit secrets in a vault', async () => {
      const vaultName = 'MyFirstVault' as VaultName;
      const editSecretVault =
        grpcUtils.promisifyUnaryCall<messages.EmptyMessage>(
          client,
          client.vaultsSecretsEdit,
        );

      const vault = await vaultManager.createVault(vaultName);

      const secretList = [
        'Secret1',
        'Secret2',
        'Secret3',
        'Secret4',
        'Secret5',
      ];

      await vault.commit(async (efs) => {
        for (const secretName of secretList) {
          await efs.writeFile(secretName, secretName);
        }
      });

      const secretMessage = new messages.secrets.Secret();
      const vaultMessage = new messages.vaults.Vault();
      vaultMessage.setNameOrId(makeVaultIdPretty(vault.vaultId));
      secretMessage.setVault(vaultMessage);
      secretMessage.setSecretName('Secret1');
      secretMessage.setSecretContent(Buffer.from('content-change'));

      await editSecretVault(secretMessage, callCredentials);

      await vault.access(async (efs) => {
        expect((await efs.readFile('Secret1')).toString()).toStrictEqual(
          'content-change',
        );
      });
    });
    test('should get secrets in a vault', async () => {
      const vaultName = 'MyFirstVault' as VaultName;

      const getSecretVault =
        grpcUtils.promisifyUnaryCall<messages.secrets.Secret>(
          client,
          client.vaultsSecretsGet,
        );

      const vault = await vaultManager.createVault(vaultName);

      const secretList = [
        'Secret1',
        'Secret2',
        'Secret3',
        'Secret4',
        'Secret5',
      ];

      await vault.commit(async (efs) => {
        for (const secretName of secretList) {
          await efs.writeFile(secretName, secretName);
        }
      });

      const secretMessage = new messages.secrets.Secret();
      const vaultMessage = new messages.vaults.Vault();
      vaultMessage.setNameOrId(makeVaultIdPretty(vault.vaultId));
      secretMessage.setVault(vaultMessage);
      secretMessage.setSecretName('Secret1');

      const response = await getSecretVault(secretMessage, callCredentials);

      expect(Buffer.from(response.getSecretContent()).toString()).toStrictEqual(
        'Secret1',
      );
    });
    test('should rename secrets in a vault', async () => {
      const vaultName = 'MyFirstVault' as VaultName;

      const renameSecretVault =
        grpcUtils.promisifyUnaryCall<messages.StatusMessage>(
          client,
          client.vaultsSecretsRename,
        );

      const vault = await vaultManager.createVault(vaultName);

      const secretList = [
        'Secret1',
        'Secret2',
        'Secret3',
        'Secret4',
        'Secret5',
      ];
      const secretList2 = [
        'Secret2',
        'Secret3',
        'Secret4',
        'Secret5',
        'Secret6',
      ];

      await vault.commit(async (efs) => {
        for (const secretName of secretList) {
          await efs.writeFile(secretName, secretName);
        }
      });

      const secretRenameMessage = new messages.secrets.Rename();
      const vaultMessage = new messages.vaults.Vault();
      const secretMessage = new messages.secrets.Secret();

      vaultMessage.setNameOrId(makeVaultIdPretty(vault.vaultId));
      secretMessage.setSecretName('Secret1');
      secretMessage.setVault(vaultMessage);
      secretRenameMessage.setNewName('Secret6');
      secretRenameMessage.setOldSecret(secretMessage);

      const response = await renameSecretVault(
        secretRenameMessage,
        callCredentials,
      );

      expect(response.getSuccess()).toBeTruthy();
      const secrets = await vault.access(async (efs) => {
        return await efs.readdir('.');
      });
      expect(secrets).toEqual(secretList2);
    });
    test('should add secrets in a vault', async () => {
      const vaultName = 'MyFirstVault' as VaultName;

      const newSecretVault =
        grpcUtils.promisifyUnaryCall<messages.StatusMessage>(
          client,
          client.vaultsSecretsNew,
        );

      const vault = await vaultManager.createVault(vaultName);

      const secretMessage = new messages.secrets.Secret();
      const vaultMessage = new messages.vaults.Vault();
      vaultMessage.setNameOrId(makeVaultIdPretty(vault.vaultId));
      secretMessage.setVault(vaultMessage);
      secretMessage.setSecretName('Secret1');
      secretMessage.setSecretContent(Buffer.from('secret-content'));

      const response = await newSecretVault(secretMessage, callCredentials);

      expect(response.getSuccess()).toBeTruthy();
      const secrets = await vault.access(async (efs) => {
        return await efs.readdir('.');
      });
      expect(secrets).toEqual(['Secret1']);
      // Expect((await vault.listSecrets()).sort()).toStrictEqual(['Secret1']);
      expect(response.getSuccess()).toBeTruthy();
      const secret = await vault.access(async (efs) => {
        return (await efs.readFile('Secret1')).toString();
      });
      expect(secret).toStrictEqual('secret-content');
    });
    test('should add a directory of secrets in a vault', async () => {
      const vaultName = 'MyFirstVault' as VaultName;
      const newDirSecretVault =
        grpcUtils.promisifyUnaryCall<messages.StatusMessage>(
          client,
          client.vaultsSecretsNewDir,
        );

      // Make a temp file for editing
      const tmpDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'pksecret'),
      );
      const secrets: Array<string> = [];
      for (let i = 0; i < 10; i++) {
        const tmpFile = `${tmpDir}/pkSecretFile${i.toString()}`;
        secrets.push(
          path.join(`${path.basename(tmpDir)}`, `pkSecretFile${i.toString()}`),
        );
        // Write secret to file
        await fs.promises.writeFile(tmpFile, tmpFile);
      }

      const vault = await vaultManager.createVault(vaultName);

      const secretDirectoryMessage = new messages.secrets.Directory();
      const vaultMessage = new messages.vaults.Vault();
      vaultMessage.setNameOrId(makeVaultIdPretty(vault.vaultId));
      secretDirectoryMessage.setVault(vaultMessage);
      secretDirectoryMessage.setSecretDirectory(tmpDir);

      await newDirSecretVault(secretDirectoryMessage, callCredentials);

      const secrets2 = await vaultOps.listSecrets(vault);
      expect(secrets2).toEqual(secrets.sort());

      // Remove temp directory
      await fs.promises.rmdir(tmpDir, { recursive: true });
    });
    // TODO: Permissions not supported yet.
    test.skip('should add permissions to a vault', async () => {
      fail('Functionality not fully implemented');
      const vaultName = 'vault1' as VaultName;
      const vaultsSetPerms =
        grpcUtils.promisifyUnaryCall<messages.StatusMessage>(
          client,
          client.vaultsPermissionsSet,
        );

      // Creating a vault
      await vaultManager.createVault(vaultName);

      // Creating a gestalts state
      await createGestaltState();

      const setVaultPermMessage = new messages.vaults.PermSet();
      const nodeMessage = new messages.nodes.Node();
      const vaultMessage = new messages.vaults.Vault();
      nodeMessage.setNodeId(node2.id);
      vaultMessage.setNameOrId(vaultName);
      setVaultPermMessage.setVault(vaultMessage);
      setVaultPermMessage.setNode(nodeMessage);
      await vaultsSetPerms(setVaultPermMessage, callCredentials);

      // FIXME: this is not implemented yet.
      const result = 'Not implemented'; //Await vaultManager.getVaultPermissions(vaultId);
      const stringResult = JSON.stringify(result);
      expect(stringResult).toContain(node2.id);
      expect(stringResult).toContain('pull');
    });
    test.skip('should remove permissions to a vault', async () => {
      const vaultName = 'vault1' as VaultName;
      const vaultsUnsetPerms =
        grpcUtils.promisifyUnaryCall<messages.StatusMessage>(
          client,
          client.vaultsPermissionsUnset,
        );

      // Creating a vault.
      const vault = await vaultManager.createVault(vaultName);
      const vaults = await vaultManager.listVaults();
      const vaultId = vault.vaultId;

      // Creating a gestalts state
      await createGestaltState();
      fail('Functionality not fully implemented');
      // FIXME: not implemented yet
      // await vaultManager.setVaultPermissions(node2.id, vaultId);

      const unsetVaultPermMessage = new messages.vaults.PermUnset();
      const nodeMessage = new messages.nodes.Node();
      const vaultMessage = new messages.vaults.Vault();
      nodeMessage.setNodeId(node2.id);
      vaultMessage.setNameOrId(vaults[0].name);
      unsetVaultPermMessage.setVault(vaultMessage);
      unsetVaultPermMessage.setNode(nodeMessage);
      await vaultsUnsetPerms(unsetVaultPermMessage, callCredentials);

      // FIXME: not implemented yet
      // const result = await vaultManager.getVaultPermissions(vaultId);
      // const stringResult = JSON.stringify(result);
      // expect(stringResult).toContain(node2.id);
      // expect(stringResult.includes('pull')).toBeFalsy();
    });
    test.skip('should get permissions to a vault', async () => {
      const vaultName = 'vault1' as VaultName;
      const vaultsPermissions =
        grpcUtils.promisifyReadableStreamCall<messages.vaults.Permission>(
          client,
          client.vaultsPermissions,
        );

      // Creating a vault
      const vault = await vaultManager.createVault(vaultName);
      const vaults = await vaultManager.listVaults();
      const vaultId = vault.vaultId;

      // Creating a gestalts state
      await createGestaltState();

      fail('Functionality not fully implemented');
      // FIXME: not implemented yet
      // await vaultManager.setVaultPermissions(node2.id, vaultId);

      const getVaultPermMessage = new messages.vaults.PermGet();
      const vaultMessage = new messages.vaults.Vault();
      const nodeMessage = new messages.nodes.Node();
      vaultMessage.setNameOrId(vaults[0].name);
      nodeMessage.setNodeId(node2.id);
      getVaultPermMessage.setVault(vaultMessage);
      getVaultPermMessage.setNode(nodeMessage);
      const resGen = vaultsPermissions(getVaultPermMessage, callCredentials);

      const results: Array<messages.vaults.Permission.AsObject> = [];
      // FIXME
      // for await (const res of resGen) {
      //   results.push(res.toObject());
      // }
      // const resultsString = JSON.stringify(results);
      // expect(resultsString).toContain(node2.id);
      // expect(resultsString).toContain('pull');
    });
    describe('vault versions', () => {
      const vaultName = 'Vault1' as VaultName;
      const secretName = 'Secret-1';
      const secretVer1 = {
        name: secretName,
        content: 'Secret-1-content-ver1',
      };
      const secretVer2 = {
        name: secretName,
        content: 'Secret-1-content-ver2',
      };
      let vaultsVersion;

      let vault: Vault;

      beforeEach(async () => {
        // Creating the vault
        vault = await vaultManager.createVault(vaultName);

        vaultsVersion =
          grpcUtils.promisifyUnaryCall<messages.vaults.VersionResult>(
            client,
            client.vaultsVersion,
          );
      });

      afterEach(async () => {
        await vaultManager.destroyVault(vault.vaultId);
      });

      test("should be able to switch a vault to a specific version of it's history using VaultName", async () => {
        // Commit some history
        await vault.commit(async (efs) => {
          await efs.writeFile(secretVer1.name, secretVer1.content);
        });
        const ver1Oid = (await vault.log())[0].oid;
        await vault.commit(async (efs) => {
          await efs.writeFile(secretVer2.name, secretVer2.content);
        });
        const ver2Oid = (await vault.log())[0].oid;
        expect(ver1Oid).not.toEqual(ver2Oid);

        // Revert the version
        const vaultMessage = new messages.vaults.Vault();
        vaultMessage.setNameOrId(vaultName);

        const vaultVersionMessage = new messages.vaults.Version();
        vaultVersionMessage.setVault(vaultMessage);
        vaultVersionMessage.setVersionId(ver1Oid);

        const response = await vaultsVersion(
          vaultVersionMessage,
          callCredentials,
        );
        expect(response.getIsLatestVersion()).toBeFalsy();

        // Read old history
        await vault.access(async (efs) => {
          expect(
            (await efs.readFile(secretVer1.name)).toString(),
          ).toStrictEqual(secretVer1.content);
        });

        // Switch back to the latest version
        vaultVersionMessage.setVersionId(ver2Oid);
        const response2 = await vaultsVersion(
          vaultVersionMessage,
          callCredentials,
        );
        expect(response2.getIsLatestVersion()).toBeTruthy();

        // Read latest history
        await vault.access(async (efs) => {
          expect(
            (await efs.readFile(secretVer2.name)).toString(),
          ).toStrictEqual(secretVer2.content);
        });
      });
      test("should be able to switch a vault to a specific version of it's history using VaultId", async () => {
        // Commit some history
        await vault.commit(async (efs) => {
          await efs.writeFile(secretVer1.name, secretVer1.content);
        });
        const ver1Oid = (await vault.log())[0].oid;
        await vault.commit(async (efs) => {
          await efs.writeFile(secretVer2.name, secretVer2.content);
        });
        const ver2Oid = (await vault.log())[0].oid;
        expect(ver1Oid).not.toEqual(ver2Oid);

        // Revert the version
        const vaultMessage = new messages.vaults.Vault();
        vaultMessage.setNameOrId(makeVaultIdPretty(vault.vaultId));

        const vaultVersionMessage = new messages.vaults.Version();
        vaultVersionMessage.setVault(vaultMessage);
        vaultVersionMessage.setVersionId(ver1Oid);

        const response = await vaultsVersion(
          vaultVersionMessage,
          callCredentials,
        );
        expect(response.getIsLatestVersion()).toBeFalsy();

        // Read old history
        await vault.access(async (efs) => {
          expect(
            (await efs.readFile(secretVer1.name)).toString(),
          ).toStrictEqual(secretVer1.content);
        });

        // Switch back to the latest version
        vaultVersionMessage.setVersionId(ver2Oid);
        const response2 = await vaultsVersion(
          vaultVersionMessage,
          callCredentials,
        );
        expect(response2.getIsLatestVersion()).toBeTruthy();

        // Read latest history
        await vault.access(async (efs) => {
          expect(
            (await efs.readFile(secretVer2.name)).toString(),
          ).toStrictEqual(secretVer2.content);
        });
      });
      test('should fail to find a non existent version', async () => {
        // Commit some history
        await vault.commit(async (efs) => {
          await efs.writeFile(secretVer1.name, secretVer1.content);
        });
        await vault.commit(async (efs) => {
          await efs.writeFile(secretVer2.name, secretVer2.content);
        });

        // Revert the version
        const vaultMessage = new messages.vaults.Vault();
        vaultMessage.setNameOrId(makeVaultIdPretty(vault.vaultId));

        const vaultVersionMessage = new messages.vaults.Version();
        vaultVersionMessage.setVault(vaultMessage);
        vaultVersionMessage.setVersionId('invalidOid');

        const response = vaultsVersion(vaultVersionMessage, callCredentials);
        await expect(response).rejects.toThrow(
          vaultErrors.ErrorVaultCommitUndefined,
        );
      });
      test('should be able to go to the end of the vault history', async () => {
        // Commit some history
        await vault.commit(async (efs) => {
          await efs.writeFile(secretVer1.name, secretVer1.content);
        });
        const ver1Oid = (await vault.log())[0].oid;
        await vault.commit(async (efs) => {
          await efs.writeFile(secretVer2.name, secretVer2.content);
        });
        const ver2Oid = (await vault.log())[0].oid;
        expect(ver1Oid).not.toEqual(ver2Oid);

        // Revert the version
        const vaultMessage = new messages.vaults.Vault();
        vaultMessage.setNameOrId(vaultName);

        const vaultVersionMessage = new messages.vaults.Version();
        vaultVersionMessage.setVault(vaultMessage);
        vaultVersionMessage.setVersionId(ver1Oid);

        const response = await vaultsVersion(
          vaultVersionMessage,
          callCredentials,
        );
        expect(response.getIsLatestVersion()).toBeFalsy();

        // Read old history
        await vault.access(async (efs) => {
          expect(
            (await efs.readFile(secretVer1.name)).toString(),
          ).toStrictEqual(secretVer1.content);
        });

        // Switch back to the latest version
        vaultVersionMessage.setVersionId('last');
        const response2 = await vaultsVersion(
          vaultVersionMessage,
          callCredentials,
        );
        expect(response2.getIsLatestVersion()).toBeTruthy();

        // Read latest history
        await vault.access(async (efs) => {
          expect(
            (await efs.readFile(secretVer2.name)).toString(),
          ).toStrictEqual(secretVer2.content);
        });
      });
      test('should destroy newer history when writing to an old version', async () => {
        const secretVer3 = {
          name: 'secret3',
          content: 'Secret-1-content-ver3',
        };
        const secretVerNew = { name: 'secretNew', content: 'NEW CONTENT' };

        // Commit some history
        await vault.commit(async (efs) => {
          await efs.writeFile(secretVer1.name, secretVer1.content);
        });
        const ver1Oid = (await vault.log())[0].oid;

        await vault.commit(async (efs) => {
          await efs.writeFile(secretVer2.name, secretVer2.content);
        });

        await vault.commit(async (efs) => {
          await efs.writeFile(secretVer3.name, secretVer3.content);
        });

        // Revert the version
        const vaultMessage = new messages.vaults.Vault();
        vaultMessage.setNameOrId(vaultName);

        const vaultVersionMessage = new messages.vaults.Version();
        vaultVersionMessage.setVault(vaultMessage);
        vaultVersionMessage.setVersionId(ver1Oid);

        const response = await vaultsVersion(
          vaultVersionMessage,
          callCredentials,
        );
        expect(response.getIsLatestVersion()).toBeFalsy();

        // Read old history
        await vault.access(async (efs) => {
          expect(
            (await efs.readFile(secretVer1.name)).toString(),
          ).toStrictEqual(secretVer1.content);
        });

        // Commit new history
        await vault.commit(async (efs) => {
          await efs.writeFile(secretVerNew.name, secretVerNew.content);
        });
        const newVerOid = (await vault.log())[0].oid;

        // Check that new commit overwrites old commits.
        const log = await vault.log();
        expect(log).toHaveLength(3);
        expect(log[0].oid).toEqual(newVerOid);

        // Check contents are correct.
        await vault.access(async (efs) => {
          expect(
            (await efs.readFile(secretVerNew.name)).toString(),
          ).toStrictEqual(secretVerNew.content);
        });
      });
    });
    describe('Vault Log', () => {
      let vaultLog;

      const vaultName = 'Vault1' as VaultName;
      const secret1 = { name: 'secret1', content: 'Secret-1-content' };
      const secret2 = { name: 'secret2', content: 'Secret-2-content' };

      let vault: Vault;
      let commit1Oid: string;
      let commit2Oid: string;
      let commit3Oid: string;

      beforeEach(async () => {
        vaultLog =
          grpcUtils.promisifyReadableStreamCall<messages.vaults.LogEntry>(
            client,
            client.vaultsLog,
          );

        // Creating the vault
        vault = await vaultManager.createVault(vaultName);

        await vault.commit(async (efs) => {
          await efs.writeFile(secret1.name, secret1.content);
        });
        commit1Oid = (await vault.log(0))[0].oid;

        await vault.commit(async (efs) => {
          await efs.writeFile(secret2.name, secret2.content);
        });
        commit2Oid = (await vault.log(0))[0].oid;

        await vault.commit(async (efs) => {
          await efs.unlink(secret2.name);
        });
        commit3Oid = (await vault.log(0))[0].oid;
      });

      afterEach(async () => {
        await vaultManager.destroyVault(vault.vaultId);
      });

      test('should get the full log', async () => {
        const vaultLog =
          grpcUtils.promisifyReadableStreamCall<messages.vaults.LogEntry>(
            client,
            client.vaultsLog,
          );
        // Lovingly crafting the message
        const vaultsLogMessage = new messages.vaults.Log();
        const vaultMessage = new messages.vaults.Vault();

        vaultMessage.setNameOrId(vaultName);
        vaultsLogMessage.setVault(vaultMessage);

        console.log('a');
        console.log(vaultsLogMessage);
        const responseGen = await vaultLog(vaultsLogMessage, callCredentials);
        console.log('a');
        const logMessages: messages.vaults.LogEntry[] = [];
        for await (const entry of responseGen) {
          logMessages.push(entry);
        }
        console.log('a');

        // Checking commits exist in order.
        expect(logMessages[2].getOid()).toEqual(commit1Oid);
        expect(logMessages[1].getOid()).toEqual(commit2Oid);
        expect(logMessages[0].getOid()).toEqual(commit3Oid);
      });
      test('should get a part of the log', async () => {
        // Lovingly crafting the message
        const vaultsLogMessage = new messages.vaults.Log();
        const vaultMessage = new messages.vaults.Vault();

        vaultMessage.setNameOrId(vaultName);
        vaultsLogMessage.setVault(vaultMessage);
        vaultsLogMessage.setLogDepth(2);

        const responseGen = await vaultLog(vaultsLogMessage, callCredentials);
        const logMessages: messages.vaults.LogEntry[] = [];
        for await (const entry of responseGen) {
          logMessages.push(entry);
        }

        // Checking commits exist in order.
        expect(logMessages[1].getOid()).toEqual(commit2Oid);
        expect(logMessages[0].getOid()).toEqual(commit3Oid);
      });
      test('should get a specific commit', async () => {
        // Lovingly crafting the message
        const vaultsLogMessage = new messages.vaults.Log();
        const vaultMessage = new messages.vaults.Vault();

        vaultMessage.setNameOrId(vaultName);
        vaultsLogMessage.setVault(vaultMessage);
        vaultsLogMessage.setCommitId(commit2Oid);

        const responseGen = await vaultLog(vaultsLogMessage, callCredentials);
        const logMessages: messages.vaults.LogEntry[] = [];
        for await (const entry of responseGen) {
          logMessages.push(entry);
        }

        // Checking commits exist in order.
        expect(logMessages[0].getOid()).toEqual(commit2Oid);
      });
    });
  });
  describe('keys', () => {
    test('should get root keypair', async () => {
      const getRootKeyPair =
        grpcUtils.promisifyUnaryCall<messages.keys.KeyPair>(
          client,
          client.keysKeyPairRoot,
        );

      const keyPair = keyManager.getRootKeyPairPem();

      const emptyMessage = new messages.EmptyMessage();

      const key = await getRootKeyPair(emptyMessage, callCredentials);

      expect(key.getPrivate()).toBe(keyPair.privateKey);
      expect(key.getPublic()).toBe(keyPair.publicKey);
    });
    test('should reset root keypair', async () => {
      const getRootKeyPair =
        grpcUtils.promisifyUnaryCall<messages.keys.KeyPair>(
          client,
          client.keysKeyPairRoot,
        );

      const resetKeyPair = grpcUtils.promisifyUnaryCall<messages.EmptyMessage>(
        client,
        client.keysKeyPairReset,
      );

      const keyPair = keyManager.getRootKeyPairPem();
      const nodeId1 = nodeManager.getNodeId();
      // @ts-ignore - get protected property
      const fwdTLSConfig1 = polykeyAgent.fwdProxy.tlsConfig;
      // @ts-ignore - get protected property
      const revTLSConfig1 = polykeyAgent.revProxy.tlsConfig;
      // @ts-ignore - get protected property
      const serverTLSConfig1 = polykeyAgent.clientGrpcServer.tlsConfig;
      const expectedTLSConfig1: TLSConfig = {
        keyPrivatePem: keyPair.privateKey,
        certChainPem: await keyManager.getRootCertChainPem(),
      };
      expect(fwdTLSConfig1).toEqual(expectedTLSConfig1);
      expect(revTLSConfig1).toEqual(expectedTLSConfig1);
      expect(serverTLSConfig1).toEqual(expectedTLSConfig1);

      const keyMessage = new messages.keys.Key();
      keyMessage.setName('somepassphrase');

      await resetKeyPair(keyMessage, callCredentials);

      const emptyMessage = new messages.EmptyMessage();

      await fs.promises.writeFile(passwordFile, 'somepassphrase');

      const key = await getRootKeyPair(emptyMessage, callCredentials);
      const nodeId2 = nodeManager.getNodeId();
      // @ts-ignore - get protected property
      const fwdTLSConfig2 = polykeyAgent.fwdProxy.tlsConfig;
      // @ts-ignore - get protected property
      const revTLSConfig2 = polykeyAgent.revProxy.tlsConfig;
      // @ts-ignore - get protected property
      const serverTLSConfig2 = polykeyAgent.clientGrpcServer.tlsConfig;
      const expectedTLSConfig2: TLSConfig = {
        keyPrivatePem: key.getPrivate(),
        certChainPem: await keyManager.getRootCertChainPem(),
      };
      expect(fwdTLSConfig2).toEqual(expectedTLSConfig2);
      expect(revTLSConfig2).toEqual(expectedTLSConfig2);
      expect(serverTLSConfig2).toEqual(expectedTLSConfig2);

      expect(key.getPrivate()).not.toBe(keyPair.privateKey);
      expect(key.getPublic()).not.toBe(keyPair.publicKey);
      expect(nodeId1).not.toBe(nodeId2);

      // Reset this static state with new node ID
      node1 = {
        id: nodeManager.getNodeId(),
        chain: {},
      };
    });
    test('should renew root keypair', async () => {
      const renewKeyPair = grpcUtils.promisifyUnaryCall<messages.EmptyMessage>(
        client,
        client.keysKeyPairRenew,
      );

      const rootKeyPair1 = keyManager.getRootKeyPairPem();
      const nodeId1 = nodeManager.getNodeId();
      // @ts-ignore - get protected property
      const fwdTLSConfig1 = polykeyAgent.fwdProxy.tlsConfig;
      // @ts-ignore - get protected property
      const revTLSConfig1 = polykeyAgent.revProxy.tlsConfig;
      // @ts-ignore - get protected property
      const serverTLSConfig1 = polykeyAgent.clientGrpcServer.tlsConfig;
      const expectedTLSConfig1: TLSConfig = {
        keyPrivatePem: rootKeyPair1.privateKey,
        certChainPem: await keyManager.getRootCertChainPem(),
      };
      expect(fwdTLSConfig1).toEqual(expectedTLSConfig1);
      expect(revTLSConfig1).toEqual(expectedTLSConfig1);
      expect(serverTLSConfig1).toEqual(expectedTLSConfig1);

      const keyMessage = new messages.keys.Key();
      keyMessage.setName('somepassphrase');

      await renewKeyPair(keyMessage, callCredentials);

      const rootKeyPair2 = keyManager.getRootKeyPairPem();
      const nodeId2 = nodeManager.getNodeId();
      // @ts-ignore - get protected property
      const fwdTLSConfig2 = polykeyAgent.fwdProxy.tlsConfig;
      // @ts-ignore - get protected property
      const revTLSConfig2 = polykeyAgent.revProxy.tlsConfig;
      // @ts-ignore - get protected property
      const serverTLSConfig2 = polykeyAgent.clientGrpcServer.tlsConfig;
      const expectedTLSConfig2: TLSConfig = {
        keyPrivatePem: rootKeyPair2.privateKey,
        certChainPem: await keyManager.getRootCertChainPem(),
      };
      expect(fwdTLSConfig2).toEqual(expectedTLSConfig2);
      expect(revTLSConfig2).toEqual(expectedTLSConfig2);
      expect(serverTLSConfig2).toEqual(expectedTLSConfig2);

      expect(rootKeyPair2.privateKey).not.toBe(rootKeyPair1.privateKey);
      expect(rootKeyPair2.publicKey).not.toBe(rootKeyPair1.publicKey);
      expect(nodeId1).not.toBe(nodeId2);

      // Reset this static state with new node ID
      node1 = {
        id: nodeManager.getNodeId(),
        chain: {},
      };
    });
    test('should encrypt and decrypt with root keypair', async () => {
      const encryptWithKeyPair =
        grpcUtils.promisifyUnaryCall<messages.keys.Crypto>(
          client,
          client.keysEncrypt,
        );

      const decryptWithKeyPair =
        grpcUtils.promisifyUnaryCall<messages.keys.Crypto>(
          client,
          client.keysDecrypt,
        );

      const plainText = Buffer.from('abc');
      const cryptoMessage = new messages.keys.Crypto();
      cryptoMessage.setData(plainText.toString('binary'));

      const cipherText = await encryptWithKeyPair(
        cryptoMessage,
        callCredentials,
      );

      cryptoMessage.setData(cipherText.getData());
      const plainText_ = await decryptWithKeyPair(
        cryptoMessage,
        callCredentials,
      );

      expect(plainText_.getData()).toBe(plainText.toString());
    });
    test('should encrypt and decrypt with root keypair', async () => {
      const signWithKeyPair =
        grpcUtils.promisifyUnaryCall<messages.keys.Crypto>(
          client,
          client.keysSign,
        );

      const verifyWithKeyPair =
        grpcUtils.promisifyUnaryCall<messages.StatusMessage>(
          client,
          client.keysVerify,
        );

      const data = Buffer.from('abc');
      const cryptoMessage = new messages.keys.Crypto();
      cryptoMessage.setData(data.toString('binary'));

      const signature = await signWithKeyPair(cryptoMessage, callCredentials);

      cryptoMessage.setSignature(signature.getSignature());

      const signed = await verifyWithKeyPair(cryptoMessage, callCredentials);

      expect(signed.getSuccess()).toBe(true);
    });
    test.skip('should change password', async () => {
      // FIXME: this and any change password, reset keys needs to be changed to use the new process.
      const changePasswordKeys =
        grpcUtils.promisifyUnaryCall<messages.EmptyMessage>(
          client,
          client.keysPasswordChange,
        );

      const passwordMessage = new messages.sessions.Password();
      passwordMessage.setPassword('newpassword');

      await changePasswordKeys(passwordMessage, callCredentials);

      await nodeManager.stop();
      // Await vaultManager.stop();
      // Await keyManager.stop();

      // Await expect(() =>
      //   keyManager.start({ password: 'password' }),
      // ).rejects.toThrow();

      // await keyManager.start({ password: 'newpassword' });
      await nodeManager.start();
      // Await vaultManager.start({});

      await keyManager.changeRootKeyPassword('password');
      await nodeManager.stop();
      // Await vaultManager.stop();
      // Await keyManager.stop();
      // Await keyManager.start({});
      await nodeManager.start();
      // Await vaultManager.start({});
    });
    test('should get the root certificate and chains', async () => {
      const getCerts = grpcUtils.promisifyUnaryCall<messages.keys.Certificate>(
        client,
        client.keysCertsGet,
      );

      const getChainCerts =
        grpcUtils.promisifyReadableStreamCall<messages.keys.Certificate>(
          client,
          client.keysCertsChainGet,
        );

      const emptyMessage = new messages.EmptyMessage();

      const res = getChainCerts(emptyMessage, callCredentials);
      const certs: Array<string> = [];
      for await (const val of res) {
        certs.push(val.getCert());
      }

      expect(certs.sort()).toStrictEqual(
        (await keyManager.getRootCertChainPems()).sort(),
      );

      const response = await getCerts(emptyMessage, callCredentials);

      expect(response.getCert()).toBe(keyManager.getRootCertPem());
    });
  });
  describe('identities', () => {
    test('should Authenticate an identity.', async () => {
      const identitiesAuthenticate =
        grpcUtils.promisifyReadableStreamCall<messages.identities.Provider>(
          client,
          client.identitiesAuthenticate,
        );

      const providerMessage = new messages.identities.Provider();
      providerMessage.setProviderId(testToken.providerId);
      providerMessage.setMessage(testToken.identityId);

      const gen = identitiesAuthenticate(providerMessage, callCredentials);

      const firstMessage = await gen.next();
      expect(firstMessage.done).toBeFalsy();
      expect(firstMessage.value).toBeTruthy();
      if (!firstMessage.value) fail('Failed to return a message');
      expect(firstMessage.value.getMessage()).toContain('randomtestcode');

      const secondMessage = await gen.next();
      expect(secondMessage.done).toBeFalsy();
      expect(secondMessage.value).toBeTruthy();
      if (!secondMessage.value) fail('Failed to return a message');
      expect(secondMessage.value.getMessage()).toContain('test_user');

      expect((await gen.next()).done).toBeTruthy();
    });
    test('should manipulate tokens for providers', async () => {
      const putToken = grpcUtils.promisifyUnaryCall<messages.EmptyMessage>(
        client,
        client.identitiesTokenPut,
      );

      const getTokens = grpcUtils.promisifyUnaryCall<messages.identities.Token>(
        client,
        client.identitiesTokenGet,
      );

      const delToken = grpcUtils.promisifyUnaryCall<messages.EmptyMessage>(
        client,
        client.identitiesTokenDelete,
      );
      const providerId = 'test-provider' as ProviderId;
      const identityId = 'test-user' as IdentityId;
      const tokenData = {
        accessToken: 'abc',
      };

      const mp = new messages.identities.Provider();
      const m = new messages.identities.TokenSpecific();

      mp.setProviderId(providerId);
      mp.setMessage(identityId);

      m.setProvider(mp);
      m.setToken('abc');

      await putToken(m, callCredentials);

      const tokenData_ = await getTokens(mp, callCredentials);
      expect(JSON.stringify(tokenData)).toStrictEqual(tokenData_.getToken());

      await delToken(mp, callCredentials);
      await delToken(mp, callCredentials);
      const tokenData__ = await getTokens(mp, callCredentials);
      expect(tokenData__.getToken()).toBe('');
    });
    test('should list providers.', async () => {
      const providersGet =
        grpcUtils.promisifyUnaryCall<messages.identities.Provider>(
          client,
          client.identitiesProvidersList,
        );

      const emptyMessage = new messages.EmptyMessage();
      const test = await providersGet(emptyMessage, callCredentials);
      // Expect(test.getId()).toContain('github.com');
      expect(test.getProviderId()).toContain('test-provider');
    });
    test('should list connected Identities.', async () => {
      const identitiesGetConnectedInfos =
        grpcUtils.promisifyReadableStreamCall<messages.identities.Info>(
          client,
          client.identitiesInfoGetConnected,
        );

      // Add the identity + token.
      await identitiesManager.putToken(
        testToken.providerId,
        testToken.identityId,
        testToken.tokenData,
      );

      const providerSearchMessage = new messages.identities.ProviderSearch();
      const providerMessage = new messages.identities.Provider();
      providerMessage.setProviderId(testToken.providerId);
      providerMessage.setMessage(testToken.identityId);
      providerSearchMessage.setProvider(providerMessage);
      providerSearchMessage.setSearchTermList([]);

      const resGen = identitiesGetConnectedInfos(
        providerSearchMessage,
        callCredentials,
      );
      let output = '';
      for await (const identityInfoMessage of resGen) {
        const objString = JSON.stringify(identityInfoMessage.toObject());
        output += objString;
      }
      expect(output).toContain('test_user2');
      expect(output).toContain('test_user2@test.com');
    });
    test('should get identity info.', async () => {
      const identitiesGetInfo =
        grpcUtils.promisifyUnaryCall<messages.identities.Provider>(
          client,
          client.identitiesInfoGet,
        );
      //Create an identity
      await identitiesManager.putToken(
        testToken.providerId,
        testToken.identityId,
        testToken.tokenData,
      );

      //Geting the info.
      const providerMessage1 = new messages.identities.Provider();
      providerMessage1.setProviderId(testToken.providerId);
      const providerMessage = await identitiesGetInfo(
        providerMessage1,
        callCredentials,
      );
      expect(providerMessage.getProviderId()).toBe(testToken.providerId);
      expect(providerMessage.getMessage()).toBe(testToken.identityId);
    });
    test('should augment a keynode.', async () => {
      const identitiesAugmentKeynode =
        grpcUtils.promisifyUnaryCall<messages.EmptyMessage>(
          client,
          client.identitiesClaim,
        );
      //Need an authenticated identity.
      await identitiesManager.putToken(
        testToken.providerId,
        testToken.identityId,
        testToken.tokenData,
      );

      //Making the call.
      const providerMessage = new messages.identities.Provider();
      providerMessage.setProviderId(testToken.providerId);
      providerMessage.setMessage(testToken.identityId);
      await identitiesAugmentKeynode(providerMessage, callCredentials);

      const res = await gestaltGraph.getGestaltByNode(nodeManager.getNodeId());
      const resString = JSON.stringify(res);
      expect(resString).toContain(testToken.providerId);
      expect(resString).toContain(testToken.identityId);
    });
  });
  describe('gestalts', () => {
    test('should get all gestalts', async () => {
      const listGestalts =
        grpcUtils.promisifyReadableStreamCall<messages.gestalts.Gestalt>(
          client,
          client.gestaltsGestaltList,
        );

      await gestaltGraph.setNode(node2);
      await gestaltGraph.setIdentity(identity1);

      const m = new messages.EmptyMessage();

      const res = listGestalts(m, callCredentials);

      const gestalts: Array<string> = [];
      for await (const val of res) {
        gestalts.push(JSON.parse(val.getName()));
      }
      await gestaltGraph.getGestaltByIdentity(
        identity1.providerId,
        identity1.identityId,
      );
      await gestaltGraph.getGestaltByNode(node2.id);
      const gestaltsString = JSON.stringify(gestalts);
      expect(gestaltsString).toContain(identity1.providerId);
      expect(gestaltsString).toContain(identity1.identityId);
      expect(gestaltsString).toContain(node2.id);
      expect(gestalts).toHaveLength(2);

      await gestaltGraph.unsetNode(node2.id);
      await gestaltGraph.unsetIdentity(
        identity1.providerId,
        identity1.identityId,
      );
    });
    test('should set independent node and identity gestalts', async () => {
      await gestaltGraph.setNode(node2);
      await gestaltGraph.setIdentity(identity1);
      const gestaltNode = await gestaltGraph.getGestaltByNode(node2.id);
      const gestaltIdentity = await gestaltGraph.getGestaltByIdentity(
        identity1.providerId,
        identity1.identityId,
      );
      const gkNode = gestaltsUtils.keyFromNode(node2.id);
      const gkIdentity = gestaltsUtils.keyFromIdentity(
        identity1.providerId,
        identity1.identityId,
      );
      expect(gestaltNode).toStrictEqual({
        matrix: { [gkNode]: {} },
        nodes: { [gkNode]: node2 },
        identities: {},
      });
      expect(gestaltIdentity).toStrictEqual({
        matrix: { [gkIdentity]: {} },
        nodes: {},
        identities: { [gkIdentity]: identity1 },
      });
    });
    test('should get gestalt from Node.', async () => {
      const gestaltsGetNode =
        grpcUtils.promisifyUnaryCall<messages.gestalts.Graph>(
          client,
          client.gestaltsGestaltGetByNode,
        );
      await createGestaltState();

      const nodeMessage = new messages.nodes.Node();
      nodeMessage.setNodeId(node2.id);

      //Making the call
      const res = await gestaltsGetNode(nodeMessage, callCredentials);
      const jsonString = res.getGestaltGraph();

      expect(jsonString).toContain('IdentityIdABC'); // Contains IdentityID
      expect(jsonString).toContain('github.com'); // Contains github provider.
      expect(jsonString).toContain(node2.id); // Contains NodeId.
    });
    test('should get gestalt from identity.', async () => {
      const gestaltsGetIdentity =
        grpcUtils.promisifyUnaryCall<messages.gestalts.Graph>(
          client,
          client.gestaltsGestaltGetByIdentity,
        );
      await createGestaltState();
      //Testing the call
      const providerMessage = new messages.identities.Provider();
      providerMessage.setProviderId(identity1.providerId);
      providerMessage.setMessage(identity1.identityId);
      const res = await gestaltsGetIdentity(providerMessage, callCredentials);
      const jsonString = res.getGestaltGraph();

      expect(jsonString).toContain('IdentityIdABC'); // Contains IdentityID
      expect(jsonString).toContain('github.com'); // Contains github provider.
      expect(jsonString).toContain(node2.id); // Contains NodeId.
    });
    test('should discover gestalt via Node.', async () => {
      const gestaltsDiscoverNode =
        grpcUtils.promisifyUnaryCall<messages.EmptyMessage>(
          client,
          client.gestaltsDiscoveryByNode,
        );

      const nodeMessage = new messages.nodes.Node();
      nodeMessage.setNodeId(node2.id);
      //I have no idea how to test this. so we just check for expected error for now.
      await expect(() =>
        gestaltsDiscoverNode(nodeMessage, callCredentials),
      ).rejects.toThrow(nodesErrors.ErrorNodeGraphEmptyDatabase);
    });
    test('should discover gestalt via Identity.', async () => {
      const gestaltsDiscoverIdentity =
        grpcUtils.promisifyUnaryCall<messages.EmptyMessage>(
          client,
          client.gestaltsDiscoveryByIdentity,
        );

      await identitiesManager.putToken(
        testToken.providerId,
        testToken.identityId,
        testToken.tokenData,
      );

      const providerMessage = new messages.identities.Provider();
      providerMessage.setProviderId(testToken.providerId);
      providerMessage.setMessage(testToken.identityId);
      //Technically contains a node, but no other thing, will succeed with no results.
      expect(
        await gestaltsDiscoverIdentity(providerMessage, callCredentials),
      ).toBeInstanceOf(messages.EmptyMessage);
    });
    test('should get gestalt permissions by node.', async () => {
      const gestaltsGetActionsByNode =
        grpcUtils.promisifyUnaryCall<messages.permissions.Actions>(
          client,
          client.gestaltsActionsGetByNode,
        );
      await gestaltGraph.setNode(node1);
      await gestaltGraph.setNode(node2);
      await gestaltGraph.setGestaltActionByNode(node2.id, 'scan');
      await gestaltGraph.setGestaltActionByNode(node2.id, 'notify');

      const nodeMessage = new messages.nodes.Node();

      nodeMessage.setNodeId(node2.id);
      // Should have permissions scan and notify as above.
      const test1 = await gestaltsGetActionsByNode(
        nodeMessage,
        callCredentials,
      );
      expect(test1.getActionList().length).toBe(2);
      expect(test1.getActionList().includes('scan')).toBeTruthy();
      expect(test1.getActionList().includes('notify')).toBeTruthy();

      nodeMessage.setNodeId(nodeManager.getNodeId());
      // Should have no permissions.
      const test2 = await gestaltsGetActionsByNode(
        nodeMessage,
        callCredentials,
      );
      expect(test2.getActionList().length).toBe(0);
    });
    test('should get gestalt permissions by Identity.', async () => {
      const gestaltsGetActionsByIdentity =
        grpcUtils.promisifyUnaryCall<messages.permissions.Actions>(
          client,
          client.gestaltsActionsGetByIdentity,
        );
      await gestaltGraph.setNode(node1);
      await gestaltGraph.setNode(node2);
      await gestaltGraph.setIdentity(identity1);
      await gestaltGraph.linkNodeAndIdentity(node2, identity1);
      await gestaltGraph.setGestaltActionByIdentity(
        identity1.providerId,
        identity1.identityId,
        'scan',
      );
      await gestaltGraph.setGestaltActionByIdentity(
        identity1.providerId,
        identity1.identityId,
        'notify',
      );

      const providerMessage = new messages.identities.Provider();
      providerMessage.setProviderId(identity1.providerId);
      providerMessage.setMessage(identity1.identityId);
      // Should have permissions scan and notify as above.
      const test1 = await gestaltsGetActionsByIdentity(
        providerMessage,
        callCredentials,
      );
      expect(test1.getActionList().length).toBe(2);
      expect(test1.getActionList().includes('scan')).toBeTruthy();
      expect(test1.getActionList().includes('notify')).toBeTruthy();

      providerMessage.setProviderId(identity1.providerId);
      providerMessage.setMessage('Not a real identity');
      // Should have no permissions.
      const test2 = await gestaltsGetActionsByIdentity(
        providerMessage,
        callCredentials,
      );
      expect(test2.getActionList().length).toBe(0);
    });
    test('should set gestalt permissions by node.', async () => {
      const gestaltsSetActionByNode =
        grpcUtils.promisifyUnaryCall<messages.EmptyMessage>(
          client,
          client.gestaltsActionsSetByNode,
        );
      await gestaltGraph.setNode(node1);
      await gestaltGraph.setNode(node2);

      const setActionsMessage = new messages.permissions.ActionSet();
      const nodeMessage = new messages.nodes.Node();
      nodeMessage.setNodeId(node2.id);
      setActionsMessage.setNode(nodeMessage);
      setActionsMessage.setAction('scan');
      // Should have permissions scan and notify as above.
      await gestaltsSetActionByNode(setActionsMessage, callCredentials);

      const check1 = await gestaltGraph.getGestaltActionsByNode(node2.id);
      expect(Object.keys(check1!)).toContain('scan');

      setActionsMessage.setAction('notify');
      await gestaltsSetActionByNode(setActionsMessage, callCredentials);
      const check2 = await gestaltGraph.getGestaltActionsByNode(node2.id);
      expect(Object.keys(check2!)).toContain('notify');
    });
    test('should set gestalt permissions by Identity.', async () => {
      const gestaltsSetActionByIdentity =
        grpcUtils.promisifyUnaryCall<messages.EmptyMessage>(
          client,
          client.gestaltsActionsSetByIdentity,
        );
      await gestaltGraph.setNode(node1);
      await gestaltGraph.setNode(node2);
      await gestaltGraph.setIdentity(identity1);
      await gestaltGraph.linkNodeAndIdentity(node2, identity1);

      const providerMessage = new messages.identities.Provider();
      providerMessage.setProviderId(identity1.providerId);
      providerMessage.setMessage(identity1.identityId);

      const setActionsMessage = new messages.permissions.ActionSet();
      setActionsMessage.setIdentity(providerMessage);
      setActionsMessage.setAction('scan');
      // Should have permissions scan and notify as above.
      await gestaltsSetActionByIdentity(setActionsMessage, callCredentials);

      const check1 = await gestaltGraph.getGestaltActionsByIdentity(
        identity1.providerId,
        identity1.identityId,
      );
      expect(Object.keys(check1!)).toContain('scan');

      setActionsMessage.setAction('notify');
      await gestaltsSetActionByIdentity(setActionsMessage, callCredentials);
      const check2 = await gestaltGraph.getGestaltActionsByIdentity(
        identity1.providerId,
        identity1.identityId,
      );
      expect(Object.keys(check2!)).toContain('notify');
    });
    test('should unset gestalt permissions by node.', async () => {
      const gestaltsUnsetActionByNode =
        grpcUtils.promisifyUnaryCall<messages.permissions.Actions>(
          client,
          client.gestaltsActionsUnsetByNode,
        );
      await gestaltGraph.setNode(node1);
      await gestaltGraph.setNode(node2);
      await gestaltGraph.setGestaltActionByNode(node2.id, 'scan');
      await gestaltGraph.setGestaltActionByNode(node2.id, 'notify');

      const nodeMessage = new messages.nodes.Node();
      nodeMessage.setNodeId(node2.id);

      const setActionsMessage = new messages.permissions.ActionSet();
      setActionsMessage.setNode(nodeMessage);
      setActionsMessage.setAction('scan');

      // Should have permissions scan and notify as above.
      await gestaltsUnsetActionByNode(setActionsMessage, callCredentials);
      const check1 = await gestaltGraph.getGestaltActionsByNode(node2.id);
      const keys = Object.keys(check1!);
      expect(keys.length).toBe(1);
      expect(keys).toContain('notify');
      expect(keys.includes('scan')).toBeFalsy();

      setActionsMessage.setAction('notify');
      await gestaltsUnsetActionByNode(setActionsMessage, callCredentials);
      const check2 = await gestaltGraph.getGestaltActionsByNode(node2.id);
      const keys2 = Object.keys(check2!);
      expect(keys2.length).toBe(0);
    });
    test('should unset gestalt permissions by Identity.', async () => {
      const gestaltsUnsetActionByIdentity =
        grpcUtils.promisifyUnaryCall<messages.permissions.Actions>(
          client,
          client.gestaltsActionsUnsetByIdentity,
        );
      await gestaltGraph.setNode(node1);
      await gestaltGraph.setNode(node2);
      await gestaltGraph.setIdentity(identity1);
      await gestaltGraph.linkNodeAndIdentity(node2, identity1);
      await gestaltGraph.setGestaltActionByIdentity(
        identity1.providerId,
        identity1.identityId,
        'scan',
      );
      await gestaltGraph.setGestaltActionByIdentity(
        identity1.providerId,
        identity1.identityId,
        'notify',
      );

      const providerMessage = new messages.identities.Provider();
      providerMessage.setProviderId(identity1.providerId);
      providerMessage.setMessage(identity1.identityId);

      const setActionsMessage = new messages.permissions.ActionSet();
      setActionsMessage.setIdentity(providerMessage);
      setActionsMessage.setAction('scan');

      // Should have permissions scan and notify as above.
      await gestaltsUnsetActionByIdentity(setActionsMessage, callCredentials);
      const check1 = await gestaltGraph.getGestaltActionsByNode(node2.id);
      const keys = Object.keys(check1!);
      expect(keys.length).toBe(1);
      expect(keys).toContain('notify');
      expect(keys.includes('scan')).toBeFalsy();

      setActionsMessage.setAction('notify');
      await gestaltsUnsetActionByIdentity(setActionsMessage, callCredentials);
      const check2 = await gestaltGraph.getGestaltActionsByNode(node2.id);
      const keys2 = Object.keys(check2!);
      expect(keys2.length).toBe(0);
    });
  });
  describe('Nodes RPC', () => {
    let server: PolykeyAgent;
    let server2: PolykeyAgent;
    beforeAll(async () => {
      server = await testKeynodeUtils.setupRemoteKeynode({
        logger: logger,
      });
      await testKeynodeUtils.addRemoteDetails(polykeyAgent, server);
      server2 = await testKeynodeUtils.setupRemoteKeynode({
        logger: logger,
      });
      await testKeynodeUtils.addRemoteDetails(polykeyAgent, server2);
    }, global.polykeyStartupTimeout * 2);
    afterAll(async () => {
      await testKeynodeUtils.cleanupRemoteKeynode(server);
      await testKeynodeUtils.cleanupRemoteKeynode(server2);
    });
    test('should add a node', async () => {
      const nodesAdd = grpcUtils.promisifyUnaryCall<messages.EmptyMessage>(
        client,
        client.nodesAdd,
      );
      const nodeId = nodeId2;
      const host = '127.0.0.1';
      const port = 11111;
      const nodeAddressMessage = new messages.nodes.Address();
      nodeAddressMessage.setNodeId(nodeId);
      nodeAddressMessage.setHost(host);
      nodeAddressMessage.setPort(port);
      await nodesAdd(nodeAddressMessage, callCredentials);
      const nodeAddress = await nodeManager.getNode(nodeId);
      if (!nodeAddress) {
        fail('Node address undefined');
      }
      expect(nodeAddress.ip).toBe(host);
      expect(nodeAddress.port).toBe(port);
    });
    test(
      'should ping a node (online + offline)',
      async () => {
        const serverNodeId = server2.nodes.getNodeId();
        await server2.stop();

        // Case 1: cannot establish new connection, so offline
        const nodesPing = grpcUtils.promisifyUnaryCall<messages.StatusMessage>(
          client,
          client.nodesPing,
        );
        const nodeMessage = new messages.nodes.Node();
        nodeMessage.setNodeId(serverNodeId);
        const res1 = await nodesPing(nodeMessage, callCredentials);
        expect(res1.getSuccess()).toEqual(false);

        // Case 2: can establish new connection, so online
        await server2.start({});
        // Update the details (changed because we started again)
        await testKeynodeUtils.addRemoteDetails(polykeyAgent, server2);
        const res2 = await nodesPing(nodeMessage, callCredentials);
        expect(res2.getSuccess()).toEqual(true);
        // Case 3: pre-existing connection no longer active, so offline
        await server2.stop();
        await sleep(30000);
        expect(await checkAgentRunning(server2.nodePath)).toBeFalsy();
        const res3 = await nodesPing(nodeMessage, callCredentials);
        expect(res3.getSuccess()).toEqual(false);
      },
      global.failedConnectionTimeout * 2,
    ); // Ping needs to timeout, so longer test timeout required
    test('should find a node (local)', async () => {
      const nodesFind = grpcUtils.promisifyUnaryCall<messages.nodes.Address>(
        client,
        client.nodesFind,
      );
      // Case 1: node already exists in the local node graph (no contact required)
      const nodeId = nodeId3;
      const nodeAddress: NodeAddress = {
        ip: '127.0.0.1' as Host,
        port: 11111 as Port,
      };
      await nodeManager.setNode(nodeId, nodeAddress);

      const nodeMessage = new messages.nodes.Node();
      nodeMessage.setNodeId(nodeId);
      const res = await nodesFind(nodeMessage, callCredentials);
      expect(res.getNodeId()).toEqual(nodeId);
      expect(res.getHost()).toEqual(nodeAddress.ip);
      expect(res.getPort()).toEqual(nodeAddress.port);
    });
    // FIXME: this operation seems to be pretty slow.
    test.skip(
      'should find a node (contacts remote node)',
      async () => {
        // FIXME, this succeeds on it's own, some crossover breaking this.
        // Case 2: node can be found on the remote node
        const nodeId = nodeId1;
        const nodeAddress: NodeAddress = {
          ip: '127.0.0.1' as Host,
          port: 11111 as Port,
        };
        // Setting the information on a remote node.
        await server.nodes.setNode(nodeId, nodeAddress);
        const nodesFind = grpcUtils.promisifyUnaryCall<messages.nodes.Address>(
          client,
          client.nodesFind,
        );
        const nodeMessage = new messages.nodes.Node();
        nodeMessage.setNodeId(nodeId);
        const res = await nodesFind(nodeMessage, callCredentials);
        expect(res.getNodeId()).toEqual(nodeId);
        expect(res.getHost()).toEqual(nodeAddress.ip);
        expect(res.getPort()).toEqual(nodeAddress.port);
      },
      global.failedConnectionTimeout * 2,
    );
    test(
      'should fail to find a node (contacts remote node)',
      async () => {
        // Case 3: node exhausts all contacts and cannot find node
        const nodeId = makeNodeId(nodeId4);
        // Add a single dummy node to the server node graph database
        // Server will not be able to connect to this node (the only node in its
        // database), and will therefore not be able to locate the node.
        await server.nodes.setNode(dummyNode, {
          ip: '127.0.0.2' as Host,
          port: 22222 as Port,
        } as NodeAddress);
        const nodesFind = grpcUtils.promisifyUnaryCall<messages.nodes.Address>(
          client,
          client.nodesFind,
        );
        const nodeMessage = new messages.nodes.Node();
        nodeMessage.setNodeId(nodeId);
        // So unfindableNode cannot be found
        await expect(() =>
          nodesFind(nodeMessage, callCredentials),
        ).rejects.toThrow(nodesErrors.ErrorNodeGraphNodeNotFound);
      },
      global.failedConnectionTimeout * 2,
    );
  });
  describe('Nodes claims', () => {
    let remoteGestalt: PolykeyAgent;
    const remoteGestaltNode: NodeInfo = {
      id: makeNodeId(nodeId5),
      chain: {},
    };
    beforeAll(async () => {
      remoteGestalt = await testKeynodeUtils.setupRemoteKeynode({ logger });
      remoteGestaltNode.id = remoteGestalt.nodes.getNodeId();
      await testKeynodeUtils.addRemoteDetails(polykeyAgent, remoteGestalt);
      await remoteGestalt.nodes.setNode(nodeManager.getNodeId(), {
        ip: polykeyAgent.revProxy.getIngressHost(),
        port: polykeyAgent.revProxy.getIngressPort(),
      } as NodeAddress);
      await polykeyAgent.acl.setNodePerm(remoteGestaltNode.id, {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });
      await remoteGestalt.acl.setNodePerm(nodeManager.getNodeId(), {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });
    }, global.polykeyStartupTimeout);
    afterEach(async () => {
      await polykeyAgent.notifications.clearNotifications();
      await remoteGestalt.notifications.clearNotifications();
    });
    afterAll(async () => {
      await remoteGestalt.stop();
      await remoteGestalt.destroy();
      await polykeyAgent.acl.setNodePerm(remoteGestaltNode.id, {
        gestalt: {},
        vaults: {},
      });
      await testKeynodeUtils.cleanupRemoteKeynode(remoteGestalt);
      await polykeyAgent.notifications.clearNotifications();
    });
    test('should send a gestalt invite (no existing invitation)', async () => {
      // Node Claim Case 1: No invitations have been received
      const nodesClaim = grpcUtils.promisifyUnaryCall<messages.StatusMessage>(
        client,
        client.nodesClaim,
      );
      const nodeClaimMessage = new messages.nodes.Claim();
      nodeClaimMessage.setNodeId(remoteGestalt.nodes.getNodeId());
      nodeClaimMessage.setForceInvite(false);
      const res = await nodesClaim(nodeClaimMessage, callCredentials);
      // We expect to send a gestalt invite, not to claim the node, so expect false
      expect(res.getSuccess()).not.toBeTruthy();
    });
    test('should send a gestalt invite (existing invitation)', async () => {
      // Node Claim Case 2: Already received an invite; force invite
      await remoteGestalt.notifications.sendNotification(
        nodeManager.getNodeId(),
        {
          type: 'GestaltInvite',
        },
      );
      const nodesClaim = grpcUtils.promisifyUnaryCall<messages.StatusMessage>(
        client,
        client.nodesClaim,
      );
      const nodeClaimMessage = new messages.nodes.Claim();
      nodeClaimMessage.setNodeId(remoteGestalt.nodes.getNodeId());
      nodeClaimMessage.setForceInvite(true);
      const res = await nodesClaim(nodeClaimMessage, callCredentials);
      // We expect to send a gestalt invite, not to claim the node, so expect false
      expect(res.getSuccess()).not.toBeTruthy();
    });
    test('should claim node', async () => {
      // Node Claim Case 3: Already received an invite; claim node
      await remoteGestalt.notifications.sendNotification(
        nodeManager.getNodeId(),
        {
          type: 'GestaltInvite',
        },
      );
      const nodesClaim = grpcUtils.promisifyUnaryCall<messages.StatusMessage>(
        client,
        client.nodesClaim,
      );
      const nodeClaimMessage = new messages.nodes.Claim();
      nodeClaimMessage.setNodeId(remoteGestalt.nodes.getNodeId());
      nodeClaimMessage.setForceInvite(false);
      const res = await nodesClaim(nodeClaimMessage, callCredentials);
      // We expect to claim the node, so expect true
      expect(res.getSuccess()).toBeTruthy();
    });
  });
  describe('Notifications RPC', () => {
    let receiver: PolykeyAgent;
    let sender: PolykeyAgent;
    beforeAll(async () => {
      receiver = await testKeynodeUtils.setupRemoteKeynode({ logger });
      sender = await testKeynodeUtils.setupRemoteKeynode({ logger });

      await sender.nodes.setNode(node1.id, {
        ip: polykeyAgent.revProxy.getIngressHost(),
        port: polykeyAgent.revProxy.getIngressPort(),
      } as NodeAddress);
      await receiver.acl.setNodePerm(node1.id, {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });
      await polykeyAgent.acl.setNodePerm(sender.nodes.getNodeId(), {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });
    }, global.polykeyStartupTimeout * 2);
    afterAll(async () => {
      await testKeynodeUtils.cleanupRemoteKeynode(receiver);
      await testKeynodeUtils.cleanupRemoteKeynode(sender);
    });
    afterEach(async () => {
      await receiver.notifications.clearNotifications();
      await sender.notifications.clearNotifications();
      await polykeyAgent.notifications.clearNotifications();
    });
    test('should send notifications.', async () => {
      // Set up a remote node receiver and add its details to agent
      await testKeynodeUtils.addRemoteDetails(polykeyAgent, receiver);

      const notificationsSend =
        grpcUtils.promisifyUnaryCall<messages.EmptyMessage>(
          client,
          client.notificationsSend,
        );

      const notificationsSendMessage = new messages.notifications.Send();
      const generalMessage = new messages.notifications.General();
      generalMessage.setMessage('msg');
      notificationsSendMessage.setReceiverId(receiver.nodes.getNodeId());
      notificationsSendMessage.setData(generalMessage);

      // Send notification returns nothing - check remote node received messages
      await notificationsSend(notificationsSendMessage, callCredentials);
      const notifs = await receiver.notifications.readNotifications();
      expect(notifs[0].data).toEqual({
        type: 'General',
        message: 'msg',
      });
      expect(notifs[0].senderId).toEqual(polykeyAgent.nodes.getNodeId());
      expect(notifs[0].isRead).toBeTruthy();
    });
    test('should read all notifications.', async () => {
      const generalData = {
        type: 'General',
        message: 'msg',
      } as NotificationData;
      const gestaltInviteData = {
        type: 'GestaltInvite',
      } as NotificationData;
      const vaultShareData = {
        type: 'VaultShare',
        vaultId: makeVaultId(idUtils.fromString('Vault1xxxxxxxxxx')).toString(),
        vaultName: 'vaultName',
        actions: {
          pull: null,
          clone: null,
        },
      } as NotificationData;

      await sender.notifications.sendNotification(node1.id, generalData);
      await sender.notifications.sendNotification(node1.id, gestaltInviteData);
      await sender.notifications.sendNotification(node1.id, vaultShareData);

      const notificationsRead =
        grpcUtils.promisifyUnaryCall<messages.notifications.List>(
          client,
          client.notificationsRead,
        );

      const notificationsReadMessage = new messages.notifications.Read();
      notificationsReadMessage.setUnread(false);
      notificationsReadMessage.setNumber('all');
      notificationsReadMessage.setOrder('newest');

      // Check the read call
      const response = await notificationsRead(
        notificationsReadMessage,
        callCredentials,
      );
      const notifs = response.getNotificationList();
      expect(notifs[0].hasVaultShare()).toBeTruthy();
      expect(notifs[0].getSenderId()).toEqual(sender.nodes.getNodeId());
      expect(notifs[0].getIsRead()).toBeTruthy();
      expect(notifs[1].hasGestaltInvite()).toBeTruthy();
      expect(notifs[1].getSenderId()).toEqual(sender.nodes.getNodeId());
      expect(notifs[1].getIsRead()).toBeTruthy();
      expect(notifs[2].hasGeneral()).toBeTruthy();
      expect(notifs[2].getSenderId()).toEqual(sender.nodes.getNodeId());
      expect(notifs[2].getIsRead()).toBeTruthy();
    });
    test('should read a single notification.', async () => {
      const msgData1 = {
        type: 'General',
        message: 'msg1',
      } as NotificationData;
      const msgData2 = {
        type: 'General',
        message: 'msg2',
      } as NotificationData;
      const msgData3 = {
        type: 'General',
        message: 'msg3',
      } as NotificationData;

      await sender.notifications.sendNotification(node1.id, msgData1);
      await sender.notifications.sendNotification(node1.id, msgData2);
      await sender.notifications.sendNotification(node1.id, msgData3);

      const notificationsRead =
        grpcUtils.promisifyUnaryCall<messages.notifications.List>(
          client,
          client.notificationsRead,
        );

      const notificationsReadMessage = new messages.notifications.Read();
      notificationsReadMessage.setUnread(false);
      notificationsReadMessage.setNumber('1');
      notificationsReadMessage.setOrder('newest');

      // Check the read call
      const response = await notificationsRead(
        notificationsReadMessage,
        callCredentials,
      );
      const notifs = response.getNotificationList();
      expect(notifs).toHaveLength(1);
      expect(notifs[0].getGeneral()!.getMessage()).toEqual('msg3');
    });
    test('should clear all notifications.', async () => {
      const msgData1 = {
        type: 'General',
        message: 'msg1',
      } as NotificationData;
      const msgData2 = {
        type: 'General',
        message: 'msg2',
      } as NotificationData;

      await sender.notifications.sendNotification(node1.id, msgData1);
      await sender.notifications.sendNotification(node1.id, msgData2);

      const notificationsClear =
        grpcUtils.promisifyUnaryCall<messages.EmptyMessage>(
          client,
          client.notificationsClear,
        );

      const emptyMessage = new messages.EmptyMessage();
      await notificationsClear(emptyMessage, callCredentials);

      // Call read notifications to check there are none
      const notifs = await polykeyAgent.notifications.readNotifications();
      expect(notifs).toEqual([]);
    });
  });
});
