import type { Vault } from '@/vaults';
import type { Host, Port } from '@/network/types';
import type { NodeId, NodeInfo, NodeAddress } from '@/nodes/types';
import type { SessionToken, SessionCredentials } from '@/sessions/types';
import type { IdentityId, IdentityInfo, ProviderId } from '@/identities/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';

import TestProvider from '../identities/TestProvider';
import { PolykeyAgent, PolykeyClient } from '@';
import { clientPB } from '@/client';
import { NodeManager } from '@/nodes';
import { GestaltGraph } from '@/gestalts';
import { VaultManager } from '@/vaults';
import { IdentitiesManager } from '@/identities';
import { Sigchain } from '@/sigchain';
import { ACL } from '@/acl';
import { KeyManager } from '@/keys';
import { NotificationsManager } from '@/notifications';
import { GithubProvider } from '@/identities/providers';
import { ForwardProxy, ReverseProxy, utils as networkUtils } from '@/network';
import { DB } from '@/db';
import { ClientClient } from '@/proto/js/Client_grpc_pb';

import * as testKeynodeUtils from '../utils';
import * as testUtils from './utils';
import * as grpcUtils from '@/grpc/utils';
import * as gestaltsUtils from '@/gestalts/utils';
import * as polykeyErrors from '@/errors';
import * as vaultErrors from '@/vaults/errors';
import * as nodesErrors from '@/nodes/errors';
import internal from 'stream';
import * as agentUtils from '@/agent/utils';
import { sleep } from '@/utils';
import { ErrorSessionTokenInvalid } from '@/errors';
import { checkAgentRunning } from '@/agent/utils';

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
  const logger = new Logger('ClientServerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let client: ClientClient;
  let server: grpc.Server;
  let port: number;

  let dataDir: string;
  let keysPath: string;
  let vaultsPath: string;
  let dbPath: string;

  let polykeyAgent: PolykeyAgent;
  let keyManager: KeyManager;
  let nodeManager: NodeManager;
  let vaultManager: VaultManager;
  let gestaltGraph: GestaltGraph;
  let identitiesManager: IdentitiesManager;
  let notificationsManager: NotificationsManager;
  let sigchain: Sigchain;
  let acl: ACL;
  let db: DB;

  let passwordFile: string;

  let fwdProxy: ForwardProxy;
  let revProxy: ReverseProxy;

  let nodeId: NodeId;

  let callCredentials: SessionCredentials;

  //node and identity infos.
  const token = {
    providerId: 'github.com' as ProviderId,
    identityId: 'tegefaulkes' as IdentityId,
    tokenData: {
      accessToken: 'Oauth token here, DO NOT COMMIT.',
    },
  };
  const testToken = {
    providerId: 'test-provider' as ProviderId,
    identityId: 'test_user' as IdentityId,
    tokenData: {
      accessToken: 'abc123',
    },
  };
  const node2: NodeInfo = {
    id: 'NodeIdABC' as NodeId,
    chain: {},
  };
  const identity1: IdentityInfo = {
    providerId: 'github.com' as ProviderId,
    identityId: 'IdentityIdABC' as IdentityId,
    claims: {},
  };
  let node1: NodeInfo;

  const password = 'password';

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
    keysPath = path.join(dataDir, 'keys');
    vaultsPath = path.join(dataDir, 'vaults');
    dbPath = path.join(dataDir, 'db');

    passwordFile = path.join(dataDir, 'password');
    await fs.promises.writeFile(passwordFile, 'password');

    fwdProxy = new ForwardProxy({
      authToken: 'abc',
      logger: logger,
    });

    polykeyAgent = new PolykeyAgent({
      nodePath: dataDir,
      logger,
      fwdProxy,
    });

    await polykeyAgent.start({ password });
    keyManager = polykeyAgent.keys;
    nodeManager = polykeyAgent.nodes;
    vaultManager = polykeyAgent.vaults;
    gestaltGraph = polykeyAgent.gestalts;
    identitiesManager = polykeyAgent.identities;
    notificationsManager = polykeyAgent.notifications;
    sigchain = polykeyAgent.sigchain;
    acl = polykeyAgent.acl;
    db = polykeyAgent.db;

    //adding provider.
    const testProvider = new TestProvider();
    identitiesManager.registerProvider(testProvider);

    [server, port] = await testUtils.openTestClientServer({
      polykeyAgent,
    });

    client = await testUtils.openSimpleClientClient(port);

    const cert = keyManager.getRootCert();
    nodeId = networkUtils.certNodeId(cert);

    //Filling in infos.
    node1 = {
      id: nodeId,
      chain: {},
    };
  }, global.polykeyStartupTimeout);
  afterAll(async () => {
    await testUtils.closeTestClientServer(server);
    testUtils.closeSimpleClientClient(client);

    await polykeyAgent.stop();

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

  test('can echo', async () => {
    const echo = grpcUtils.promisifyUnaryCall<clientPB.EchoMessage>(
      client,
      client.echo,
    );
    const m = new clientPB.EchoMessage();
    m.setChallenge('Hello');
    const res: clientPB.EchoMessage = await echo(m, callCredentials);
    expect(res.getChallenge()).toBe('Hello');

    // Hard Coded error
    m.setChallenge('ThrowAnError');
    await expect(echo(m)).rejects.toThrow(polykeyErrors.ErrorPolykey);
  });
  describe('sessions', () => {
    test('can request a session', async () => {
      const requestJWT =
        grpcUtils.promisifyUnaryCall<clientPB.SessionTokenMessage>(
          client,
          client.sessionUnlock,
        );

      const meta = new grpc.Metadata();
      meta.set('passwordFile', passwordFile);

      const emptyMessage = new clientPB.EmptyMessage();

      const res = await requestJWT(emptyMessage, meta);
      expect(typeof res.getToken()).toBe('string');
      const result = await polykeyAgent.sessions.verifyToken(
        res.getToken() as SessionToken,
      );
      expect(result).toBeTruthy();
    });
    // refresh seems odd to me. It provides a new token to the client.
    // I don't know how I can force this to happen to test it. needs digging.
    test.todo('can refresh session');
    test.todo('actions over GRPC refresh the session'); // How do I even test this?
    test('session can lock all', async () => {
      //Starts off unlocked.

      const echo = grpcUtils.promisifyUnaryCall<clientPB.EchoMessage>(
        client,
        client.echo,
      );

      // checking that session is working.
      const echoMessage = new clientPB.EchoMessage();
      echoMessage.setChallenge('Hello');
      const res = await echo(echoMessage, callCredentials);
      expect(res.getChallenge()).toBe('Hello');

      //locking the session.
      const sessionLockAll = grpcUtils.promisifyUnaryCall<clientPB.EchoMessage>(
        client,
        client.sessionLockAll,
      );

      const emptyMessage = new clientPB.EmptyMessage();
      await sessionLockAll(emptyMessage, callCredentials);

      //Should reject the session token.
      await expect(echo(echoMessage, callCredentials)).rejects.toThrow(
        ErrorSessionTokenInvalid,
      );
    });
  });
  describe('agent', () => {
    test(
      'stop',
      async () => {
        //starting agent
        const newNodePath = path.join(dataDir, 'newAgent');
        const agent = new PolykeyAgent({
          nodePath: newNodePath,
          logger,
        });

        await agent.start({
          password,
        });
        const sessionToken = await agent.sessions.generateToken();
        callCredentials = testUtils.createCallCredentials(sessionToken);

        const newClient = new PolykeyClient({
          nodePath: newNodePath,
          logger,
        });
        await newClient.start({});

        const emptyMessage = new clientPB.EmptyMessage();
        await newClient.grpcClient.agentStop(emptyMessage, callCredentials);
        await sleep(10000);

        expect(await agentUtils.checkAgentRunning(newNodePath)).toBeFalsy();
        await newClient.stop();
      },
      global.polykeyStartupTimeout + 10000,
    );
  });
  describe('vaults', () => {
    async function cleanVault(vaultName: string) {
      const vaultID = await vaultManager.getVaultId(vaultName);
      if (vaultID === undefined) return;
      await vaultManager.deleteVault(vaultID);
    }

    async function cleanVaultList(vaultList: Array<string>) {
      for (const vaultName of vaultList) {
        await cleanVault(vaultName);
      }
    }

    test('should get vaults', async () => {
      const listVaults =
        grpcUtils.promisifyReadableStreamCall<clientPB.VaultListMessage>(
          client,
          client.vaultsList,
        );

      const vaultList = ['Vault1', 'Vault2', 'Vault3', 'Vault4', 'Vault5'];

      for (const vaultName of vaultList) {
        await vaultManager.createVault(vaultName);
      }

      const emptyMessage = new clientPB.EmptyMessage();
      const res = listVaults(emptyMessage, callCredentials);
      const names: Array<string> = [];
      for await (const val of res) {
        names.push(val.getName());
      }

      expect(names.sort()).toStrictEqual(vaultList.sort());

      await cleanVaultList(vaultList);
    });
    test('should create vault', async () => {
      const createVault = grpcUtils.promisifyUnaryCall<clientPB.VaultMessage>(
        client,
        client.vaultsCreate,
      );

      const vaultMessage = new clientPB.VaultMessage();
      vaultMessage.setName('NewVault');

      const vaultId = await createVault(vaultMessage, callCredentials);
      const vault = (await vaultManager.listVaults()).pop();
      expect(vault?.name).toBe('NewVault');
      expect(vault?.id).toBe(vaultId.getId());

      await cleanVault('NewVault');
    });
    test('should delete vaults', async () => {
      const deleteVault = grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
        client,
        client.vaultsDelete,
      );

      const vaultList = ['Vault1', 'Vault2', 'Vault3', 'Vault4', 'Vault5'];
      const vaultList2 = ['Vault2', 'Vault3', 'Vault4', 'Vault5'];

      const vaults: Array<Vault> = [];

      for (const vaultName of vaultList) {
        vaults.push(await vaultManager.createVault(vaultName));
      }

      const vaultMessage = new clientPB.VaultMessage();
      vaultMessage.setName(vaults[0].vaultId);

      const res = await deleteVault(vaultMessage, callCredentials);
      expect(res.getSuccess()).toBe(true);

      const list: Array<string> = [];
      const listVaults = (await vaultManager.listVaults()).sort();
      for (const vault of listVaults) {
        list.push(vault.name);
      }
      expect(list).toStrictEqual(vaultList2.sort());

      await expect(deleteVault(vaultMessage, callCredentials)).rejects.toThrow(
        vaultErrors.ErrorVaultUndefined,
      );

      await cleanVaultList(vaultList);
    });
    test('should rename vaults', async () => {
      const renameVault = grpcUtils.promisifyUnaryCall<clientPB.VaultMessage>(
        client,
        client.vaultsRename,
      );

      const vault = await vaultManager.createVault('MyFirstVault');

      const vaultRenameMessage = new clientPB.VaultRenameMessage();
      const vaultMessage = new clientPB.VaultMessage();
      vaultMessage.setName(vault.vaultName);
      vaultRenameMessage.setVault(vaultMessage);
      vaultRenameMessage.setNewname('MyRenamedVault');

      const vaultId = await renameVault(vaultRenameMessage, callCredentials);
      expect(vaultId.getId()).toBe(vault.vaultId);

      const name = (await vaultManager.listVaults()).pop()?.name;
      expect(name).toBe('MyRenamedVault');

      await cleanVault('MyRenamedVault');
    });
    test('should get stats for vaults', async () => {
      const statsVault = grpcUtils.promisifyUnaryCall<clientPB.StatMessage>(
        client,
        client.vaultsStat,
      );

      const vault = await vaultManager.createVault('MyFirstVault');
      const vault2 = await vaultManager.createVault('MySecondVault');

      const vaultMessage = new clientPB.VaultMessage();
      vaultMessage.setName(vault.vaultId);

      const res = await statsVault(vaultMessage, callCredentials);
      const stats1 = res.getStats();

      vaultMessage.setName(vault2.vaultId);
      const res2 = await statsVault(vaultMessage, callCredentials);
      const stats2 = res2.getStats();

      expect(stats1).toBe(
        JSON.stringify(await vaultManager.vaultStats(vault.vaultId)),
      );
      expect(stats2).toBe(
        JSON.stringify(await vaultManager.vaultStats(vault2.vaultId)),
      );

      await cleanVaultList(['MyFirstVault', 'MySecondVault']);
    });
    test('should make a directory in a vault', async () => {
      const mkdirVault = grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
        client,
        client.vaultsMkdir,
      );

      const vault = await vaultManager.createVault('MySecondVault');
      const dirPath = 'dir/dir1/dir2';

      const vaultMkdirMessage = new clientPB.VaultMkdirMessage();
      const vaultMessage = new clientPB.VaultMessage();
      vaultMessage.setName(vault.vaultName);
      vaultMkdirMessage.setVault(vaultMessage);
      vaultMkdirMessage.setDirname(dirPath);

      await mkdirVault(vaultMkdirMessage, callCredentials);

      await expect(
        fs.promises.readdir(path.join(dataDir, 'vaults', vault.vaultId)),
      ).resolves.toContain(`dir.data`);
    });
    test('should list secrets in a vault', async () => {
      const listSecretsVault =
        grpcUtils.promisifyReadableStreamCall<clientPB.SecretMessage>(
          client,
          client.vaultsListSecrets,
        );

      const vault = await vaultManager.createVault('MyFirstVault');

      const secretList = [
        'Secret1',
        'Secret2',
        'Secret3',
        'Secret4',
        'Secret5',
      ];

      for (const secretName of secretList) {
        await vault.addSecret(secretName, secretName);
      }

      const vaultMessage = new clientPB.VaultMessage();
      vaultMessage.setName(vault.vaultName);

      const res = listSecretsVault(vaultMessage, callCredentials);

      const names: Array<string> = [];
      for await (const val of res) {
        names.push(val.getName());
      }

      expect(names.sort()).toStrictEqual(secretList.sort());

      await cleanVault('MyFirstVault');
    });
    test('should delete secrets in a vault', async () => {
      const deleteSecretVault =
        grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
          client,
          client.vaultsDeleteSecret,
        );

      const vault = await vaultManager.createVault('MyFirstVault');

      const secretList = [
        'Secret1',
        'Secret2',
        'Secret3',
        'Secret4',
        'Secret5',
      ];
      const secretList2 = ['Secret2', 'Secret3', 'Secret4', 'Secret5'];

      for (const secretName of secretList) {
        await vault.addSecret(secretName, secretName);
      }

      const secretMessage = new clientPB.SecretMessage();
      const vaultMessage = new clientPB.VaultMessage();
      vaultMessage.setName(vault.vaultName);
      secretMessage.setVault(vaultMessage);
      secretMessage.setName('Secret1');

      const res = await deleteSecretVault(secretMessage, callCredentials);
      expect(res.getSuccess()).toBeTruthy();

      expect((await vault.listSecrets()).sort()).toStrictEqual(
        secretList2.sort(),
      );

      await cleanVault('MyFirstVault');
    });
    test('should edit secrets in a vault', async () => {
      const editSecretVault =
        grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
          client,
          client.vaultsEditSecret,
        );

      const vault = await vaultManager.createVault('MyFirstVault');

      const secretList = [
        'Secret1',
        'Secret2',
        'Secret3',
        'Secret4',
        'Secret5',
      ];

      for (const secretName of secretList) {
        await vault.addSecret(secretName, secretName);
      }

      const secretEditMessage = new clientPB.SecretEditMessage();
      const secretMessage = new clientPB.SecretMessage();
      const vaultMessage = new clientPB.VaultMessage();
      vaultMessage.setName(vault.vaultName);
      secretMessage.setVault(vaultMessage);
      secretMessage.setName('Secret1');
      secretMessage.setContent('content-change');
      secretEditMessage.setSecret(secretMessage);

      await editSecretVault(secretEditMessage, callCredentials);

      expect((await vault.getSecret('Secret1')).toString()).toStrictEqual(
        'content-change',
      );

      await cleanVault('MyFirstVault');
    });
    test('should get secrets in a vault', async () => {
      const getSecretVault =
        grpcUtils.promisifyUnaryCall<clientPB.SecretMessage>(
          client,
          client.vaultsGetSecret,
        );

      const vault = await vaultManager.createVault('MyFirstVault');

      const secretList = [
        'Secret1',
        'Secret2',
        'Secret3',
        'Secret4',
        'Secret5',
      ];

      for (const secretName of secretList) {
        await vault.addSecret(secretName, secretName);
      }

      const secretMessage = new clientPB.SecretMessage();
      const vaultMessage = new clientPB.VaultMessage();
      vaultMessage.setName(vault.vaultName);
      secretMessage.setVault(vaultMessage);
      secretMessage.setName('Secret1');

      const response = await getSecretVault(secretMessage, callCredentials);

      expect(response.getContent()).toStrictEqual('Secret1');

      await cleanVault('MyFirstVault');
    });
    test('should rename secrets in a vault', async () => {
      const renameSecretVault =
        grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
          client,
          client.vaultsRenameSecret,
        );

      const vault = await vaultManager.createVault('MyFirstVault');

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

      for (const secretName of secretList) {
        await vault.addSecret(secretName, secretName);
      }

      const secretRenameMessage = new clientPB.SecretRenameMessage();
      const vaultMessage = new clientPB.VaultMessage();
      const secretMessage = new clientPB.SecretMessage();

      vaultMessage.setName(vault.vaultName);
      secretMessage.setName('Secret1');
      secretMessage.setVault(vaultMessage);
      secretRenameMessage.setNewname('Secret6');
      secretRenameMessage.setOldsecret(secretMessage);

      const response = await renameSecretVault(
        secretRenameMessage,
        callCredentials,
      );

      expect(response.getSuccess()).toBeTruthy();
      expect((await vault.listSecrets()).sort()).toStrictEqual(
        secretList2.sort(),
      );

      await cleanVault('MyFirstVault');
    });
    test('should add secrets in a vault', async () => {
      const newSecretVault =
        grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
          client,
          client.vaultsNewSecret,
        );

      const vault = await vaultManager.createVault('MyFirstVault');

      const secretMessage = new clientPB.SecretMessage();
      const vaultMessage = new clientPB.VaultMessage();
      vaultMessage.setName(vault.vaultName);
      secretMessage.setVault(vaultMessage);
      secretMessage.setName('Secret1');
      secretMessage.setContent('secret-content');

      const response = await newSecretVault(secretMessage, callCredentials);

      expect(response.getSuccess()).toBeTruthy();
      expect((await vault.listSecrets()).sort()).toStrictEqual(['Secret1']);
      expect((await vault.getSecret('Secret1')).toString()).toStrictEqual(
        'secret-content',
      );

      await cleanVault('MyFirstVault');
    });
    test('should add a directory of secrets in a vault', async () => {
      const newDirSecretVault =
        grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
          client,
          client.vaultsNewDirSecret,
        );

      // make a temp file for editing
      const tmpDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'pksecret'),
      );
      const secrets: Array<string> = [];
      for (let i = 0; i < 10; i++) {
        const tmpFile = `${tmpDir}/pkSecretFile${i.toString()}`;
        secrets.push(
          path.join(`${path.basename(tmpDir)}`, `pkSecretFile${i.toString()}`),
        );
        // write secret to file
        await fs.promises.writeFile(tmpFile, tmpFile);
      }

      const vault = await vaultManager.createVault('MyFirstVault');

      const secretDirectoryMessage = new clientPB.SecretDirectoryMessage();
      const vaultMessage = new clientPB.VaultMessage();
      vaultMessage.setName(vault.vaultName);
      secretDirectoryMessage.setVault(vaultMessage);
      secretDirectoryMessage.setSecretdirectory(tmpDir);

      await newDirSecretVault(secretDirectoryMessage, callCredentials);

      expect((await vault.listSecrets()).sort()).toStrictEqual(secrets.sort());

      // remove temp directory
      await fs.promises.rmdir(tmpDir, { recursive: true });

      await cleanVault('MyFirstVault');
    });
    test('should add permissions to a vault', async () => {
      const vaultsSetPerms =
        grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
          client,
          client.vaultsSetPerms,
        );

      // Creating a vault
      await vaultManager.createVault('vault1');
      const vaults = await vaultManager.listVaults();
      const vaultId = vaults[0].id;

      // Creating a gestalts state
      await createGestaltState();

      const setVaultPermMessage = new clientPB.SetVaultPermMessage();
      const nodeMessage = new clientPB.NodeMessage();
      const vaultMessage = new clientPB.VaultMessage();
      nodeMessage.setName(node2.id);
      vaultMessage.setName(vaults[0].name);
      setVaultPermMessage.setVault(vaultMessage);
      setVaultPermMessage.setNode(nodeMessage);
      await vaultsSetPerms(setVaultPermMessage, callCredentials);

      const result = await vaultManager.getVaultPermissions(vaultId);
      const stringResult = JSON.stringify(result);
      expect(stringResult).toContain(node2.id);
      expect(stringResult).toContain('pull');

      await cleanVault('vault1');
    });
    test('should remove permissions to a vault', async () => {
      const vaultsUnsetPerms =
        grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
          client,
          client.vaultsUnsetPerms,
        );

      // Creating a vault.
      await vaultManager.createVault('vault1');
      const vaults = await vaultManager.listVaults();
      const vaultId = vaults[0].id;

      // Creating a gestalts state
      await createGestaltState();
      await vaultManager.setVaultPermissions(node2.id, vaultId);

      const unsetVaultPermMessage = new clientPB.UnsetVaultPermMessage();
      const nodeMessage = new clientPB.NodeMessage();
      const vaultMessage = new clientPB.VaultMessage();
      nodeMessage.setName(node2.id);
      vaultMessage.setName(vaults[0].name);
      unsetVaultPermMessage.setVault(vaultMessage);
      unsetVaultPermMessage.setNode(nodeMessage);
      await vaultsUnsetPerms(unsetVaultPermMessage, callCredentials);

      const result = await vaultManager.getVaultPermissions(vaultId);
      const stringResult = JSON.stringify(result);
      expect(stringResult).toContain(node2.id);
      expect(stringResult.includes('pull')).toBeFalsy();

      await cleanVault('vault1');
    });
    test('should get permissions to a vault', async () => {
      const vaultsPermissions =
        grpcUtils.promisifyReadableStreamCall<clientPB.PermissionMessage>(
          client,
          client.vaultsPermissions,
        );

      // Creating a vault
      await vaultManager.createVault('vault1');
      const vaults = await vaultManager.listVaults();
      const vaultId = vaults[0].id;

      // Creating a gestalts state
      await createGestaltState();
      await vaultManager.setVaultPermissions(node2.id, vaultId);

      const getVaultPermMessage = new clientPB.GetVaultPermMessage();
      const vaultMessage = new clientPB.VaultMessage();
      const nodeMessage = new clientPB.NodeMessage();
      vaultMessage.setName(vaults[0].name);
      nodeMessage.setName(node2.id);
      getVaultPermMessage.setVault(vaultMessage);
      getVaultPermMessage.setNode(nodeMessage);
      const resGen = vaultsPermissions(getVaultPermMessage, callCredentials);

      const results: Array<clientPB.PermissionMessage.AsObject> = [];
      for await (const res of resGen) {
        results.push(res.toObject());
      }
      const resultsString = JSON.stringify(results);
      expect(resultsString).toContain(node2.id);
      expect(resultsString).toContain('pull');

      await cleanVault('vault1');
    });
  });
  describe('keys', () => {
    test('should get root keypair', async () => {
      const getRootKeyPair =
        grpcUtils.promisifyUnaryCall<clientPB.KeyPairMessage>(
          client,
          client.keysRootKeyPair,
        );

      const keyPair = keyManager.getRootKeyPairPem();

      const emptyMessage = new clientPB.EmptyMessage();

      const key = await getRootKeyPair(emptyMessage, callCredentials);

      expect(key.getPrivate()).toBe(keyPair.privateKey);
      expect(key.getPublic()).toBe(keyPair.publicKey);
    });
    test('should reset root keypair', async () => {
      const getRootKeyPair =
        grpcUtils.promisifyUnaryCall<clientPB.KeyPairMessage>(
          client,
          client.keysRootKeyPair,
        );

      const resetKeyPair = grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
        client,
        client.keysResetKeyPair,
      );

      const keyPair = keyManager.getRootKeyPairPem();

      const keyMessage = new clientPB.KeyMessage();
      keyMessage.setName('somepassphrase');

      await resetKeyPair(keyMessage, callCredentials);

      const emptyMessage = new clientPB.EmptyMessage();

      await fs.promises.writeFile(passwordFile, 'somepassphrase');

      const key = await getRootKeyPair(emptyMessage, callCredentials);

      expect(key.getPrivate()).not.toBe(keyPair.privateKey);
      expect(key.getPublic()).not.toBe(keyPair.publicKey);
    });
    test('should renew root keypair', async () => {
      const renewKeyPair = grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
        client,
        client.keysRenewKeyPair,
      );

      const rootKeyPair1 = keyManager.getRootKeyPairPem();

      const keyMessage = new clientPB.KeyMessage();
      keyMessage.setName('somepassphrase');

      await renewKeyPair(keyMessage, callCredentials);

      const rootKeyPair2 = keyManager.getRootKeyPairPem();

      expect(rootKeyPair2.privateKey).not.toBe(rootKeyPair1.privateKey);
      expect(rootKeyPair2.publicKey).not.toBe(rootKeyPair1.publicKey);
    });
    test('should encrypt and decrypt with root keypair', async () => {
      const encryptWithKeyPair =
        grpcUtils.promisifyUnaryCall<clientPB.CryptoMessage>(
          client,
          client.keysEncrypt,
        );

      const decryptWithKeyPair =
        grpcUtils.promisifyUnaryCall<clientPB.CryptoMessage>(
          client,
          client.keysDecrypt,
        );

      const plainText = Buffer.from('abc');
      const cryptoMessage = new clientPB.CryptoMessage();
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
        grpcUtils.promisifyUnaryCall<clientPB.CryptoMessage>(
          client,
          client.keysSign,
        );

      const verifyWithKeyPair =
        grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
          client,
          client.keysVerify,
        );

      const data = Buffer.from('abc');
      const cryptoMessage = new clientPB.CryptoMessage();
      cryptoMessage.setData(data.toString('binary'));

      const signature = await signWithKeyPair(cryptoMessage, callCredentials);

      cryptoMessage.setSignature(signature.getSignature());

      const signed = await verifyWithKeyPair(cryptoMessage, callCredentials);

      expect(signed.getSuccess()).toBe(true);
    });
    test('should change password', async () => {
      const changePasswordKeys =
        grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
          client,
          client.keysChangePassword,
        );
      const nodeId = polykeyAgent.nodes.getNodeId();

      const passwordMessage = new clientPB.PasswordMessage();
      passwordMessage.setPassword('newpassword');

      await changePasswordKeys(passwordMessage, callCredentials);

      await nodeManager.stop();
      await vaultManager.stop();
      await keyManager.stop();

      await expect(
        keyManager.start({ password: 'password' }),
      ).rejects.toThrow();

      await keyManager.start({ password: 'newpassword' });
      await nodeManager.start({ nodeId });
      await vaultManager.start({});

      await keyManager.changeRootKeyPassword('password');
      await nodeManager.stop();
      await vaultManager.stop();
      await keyManager.stop();
      await keyManager.start({ password: 'password' });
      await nodeManager.start({ nodeId });
      await vaultManager.start({});
    });
    test('should get the root certificate and chains', async () => {
      const getCerts =
        grpcUtils.promisifyUnaryCall<clientPB.CertificateMessage>(
          client,
          client.certsGet,
        );

      const getChainCerts =
        grpcUtils.promisifyReadableStreamCall<clientPB.CertificateMessage>(
          client,
          client.certsChainGet,
        );

      const emptyMessage = new clientPB.EmptyMessage();

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
        grpcUtils.promisifyReadableStreamCall<clientPB.ProviderMessage>(
          client,
          client.identitiesAuthenticate,
        );

      const providerMessage = new clientPB.ProviderMessage();
      providerMessage.setId(testToken.providerId);
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
      const putToken = grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
        client,
        client.identitiesPutToken,
      );

      const getTokens = grpcUtils.promisifyUnaryCall<clientPB.TokenMessage>(
        client,
        client.identitiesGetToken,
      );

      const delToken = grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
        client,
        client.identitiesDeleteToken,
      );
      const providerId = 'test-provider' as ProviderId;
      const identityId = 'test-user' as IdentityId;
      const tokenData = {
        accessToken: 'abc',
      };

      const mp = new clientPB.ProviderMessage();
      const m = new clientPB.TokenSpecificMessage();

      mp.setId(providerId);
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
        grpcUtils.promisifyUnaryCall<clientPB.ProviderMessage>(
          client,
          client.identitiesGetProviders,
        );

      const emptyMessage = new clientPB.EmptyMessage();
      const test = await providersGet(emptyMessage, callCredentials);
      // expect(test.getId()).toContain('github.com');
      expect(test.getId()).toContain('test-provider');
    });
    test('should list connected Identities.', async () => {
      const identitiesGetConnectedInfos =
        grpcUtils.promisifyReadableStreamCall<clientPB.IdentityInfoMessage>(
          client,
          client.identitiesGetConnectedInfos,
        );

      // Add the identity + token.
      await identitiesManager.putToken(
        testToken.providerId,
        testToken.identityId,
        testToken.tokenData,
      );

      const providerSearchMessage = new clientPB.ProviderSearchMessage();
      const providerMessage = new clientPB.ProviderMessage();
      providerMessage.setId(testToken.providerId);
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
        grpcUtils.promisifyUnaryCall<clientPB.ProviderMessage>(
          client,
          client.identitiesGetInfo,
        );
      //Create an identity
      await identitiesManager.putToken(
        testToken.providerId,
        testToken.identityId,
        testToken.tokenData,
      );

      //Geting the info.
      const providerMessage1 = new clientPB.ProviderMessage();
      providerMessage1.setId(testToken.providerId);
      const providerMessage = await identitiesGetInfo(
        providerMessage1,
        callCredentials,
      );
      expect(providerMessage.getId()).toBe(testToken.providerId);
      expect(providerMessage.getMessage()).toBe(testToken.identityId);
    });
    test('should augment a keynode.', async () => {
      const identitiesAugmentKeynode =
        grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
          client,
          client.identitiesAugmentKeynode,
        );
      //Need an authenticated identity.
      await identitiesManager.putToken(
        testToken.providerId,
        testToken.identityId,
        testToken.tokenData,
      );

      //making the call.
      const providerMessage = new clientPB.ProviderMessage();
      providerMessage.setId(testToken.providerId);
      providerMessage.setMessage(testToken.identityId);
      await identitiesAugmentKeynode(providerMessage, callCredentials);

      const res = await gestaltGraph.getGestaltByNode(nodeId);
      const resString = JSON.stringify(res);
      expect(resString).toContain(testToken.providerId);
      expect(resString).toContain(testToken.identityId);
    });
  });
  describe('gestalts', () => {
    test('should get all gestalts', async () => {
      const listGestalts =
        grpcUtils.promisifyReadableStreamCall<clientPB.GestaltMessage>(
          client,
          client.gestaltsList,
        );

      await gestaltGraph.setNode(node2);
      await gestaltGraph.setIdentity(identity1);

      const m = new clientPB.EmptyMessage();

      const res = listGestalts(m, callCredentials);

      const gestalts: Array<string> = [];
      for await (const val of res) {
        gestalts.push(JSON.parse(val.getName()));
      }
      const identityGestalt = await gestaltGraph.getGestaltByIdentity(
        identity1.providerId,
        identity1.identityId,
      );
      const nodeGestalt = await gestaltGraph.getGestaltByNode(node2.id);
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
        grpcUtils.promisifyUnaryCall<clientPB.GestaltMessage>(
          client,
          client.gestaltsGetNode,
        );
      await createGestaltState();

      const nodeMessage = new clientPB.NodeMessage();
      nodeMessage.setName(node2.id);

      //making the call
      const res = await gestaltsGetNode(nodeMessage, callCredentials);
      const jsonString = res.getName();

      expect(jsonString).toContain('IdentityIdABC'); // Contains IdentityID
      expect(jsonString).toContain('github.com'); // Contains github provider.
      expect(jsonString).toContain('NodeIdABC'); // Contains NodeId.
    });
    test('should get gestalt from identity.', async () => {
      const gestaltsGetIdentity =
        grpcUtils.promisifyUnaryCall<clientPB.GestaltMessage>(
          client,
          client.gestaltsGetIdentity,
        );
      await createGestaltState();
      //testing the call
      const providerMessage = new clientPB.ProviderMessage();
      providerMessage.setId(identity1.providerId);
      providerMessage.setMessage(identity1.identityId);
      const res = await gestaltsGetIdentity(providerMessage, callCredentials);
      const jsonString = res.getName();

      expect(jsonString).toContain('IdentityIdABC'); // Contains IdentityID
      expect(jsonString).toContain('github.com'); // Contains github provider.
      expect(jsonString).toContain('NodeIdABC'); // Contains NodeId.
    });
    test('should set/unset a gestalt Node.', async () => {
      const gestaltsSetNode =
        grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
          client,
          client.gestaltsSetNode,
        );

      await gestaltGraph.setNode(node1);

      const gestaltTrustMessage = new clientPB.GestaltTrustMessage();
      gestaltTrustMessage.setName(node2.id);
      gestaltTrustMessage.setSet(true);

      //Making the call.
      await gestaltsSetNode(gestaltTrustMessage, callCredentials);

      const res = await gestaltGraph.getGestaltByNode(node1.id);
      const resString = JSON.stringify(res);
      expect(resString).toContain(node1.id);
      expect(resString).toContain(node2.id);

      gestaltTrustMessage.setSet(false);
      await gestaltsSetNode(gestaltTrustMessage, callCredentials);

      const res2 = await gestaltGraph.getGestaltByNode(node1.id);
      const resString2 = JSON.stringify(res2);
      expect(resString2).toContain(node1.id);
      expect(resString2.includes(node2.id)).toBeFalsy();
    });
    test('should set/unset a gestalt Identity.', async () => {
      const gestaltsSetIdentity =
        grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
          client,
          client.gestaltsSetIdentity,
        );

      await gestaltGraph.setNode(node1);
      await gestaltGraph.setIdentity(identity1);

      const gestaltTrustMessage = new clientPB.GestaltTrustMessage();
      gestaltTrustMessage.setProvider(identity1.providerId);
      gestaltTrustMessage.setName(identity1.identityId);
      gestaltTrustMessage.setSet(true);

      //Making the call.
      await gestaltsSetIdentity(gestaltTrustMessage, callCredentials);

      const res = await gestaltGraph.getGestaltByNode(node1.id);
      const resString = JSON.stringify(res);
      expect(resString).toContain(identity1.providerId);
      expect(resString).toContain(identity1.identityId);
      expect(resString).toContain(node1.id);

      gestaltTrustMessage.setSet(false);
      await gestaltsSetIdentity(gestaltTrustMessage, callCredentials);

      const res2 = await gestaltGraph.getGestaltByNode(node1.id);
      const resString2 = JSON.stringify(res2);
      expect(resString2).toContain(node1.id);
      expect(resString2.includes(identity1.providerId)).toBeFalsy();
      expect(resString2.includes(identity1.identityId)).toBeFalsy();
    });
    test('should discover gestalt via Node.', async () => {
      const gestaltsDiscoverNode =
        grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
          client,
          client.gestaltsDiscoverNode,
        );

      const nodeMessage = new clientPB.NodeMessage();
      nodeMessage.setName(node2.id);
      //I have no idea how to test this. so we just check for expected error for now.
      await expect(
        gestaltsDiscoverNode(nodeMessage, callCredentials),
      ).rejects.toThrow(nodesErrors.ErrorNodeGraphEmptyDatabase);
    });
    test('should discover gestalt via Identity.', async () => {
      const gestaltsDiscoverIdentity =
        grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
          client,
          client.gestaltsDiscoverIdentity,
        );

      await identitiesManager.putToken(
        testToken.providerId,
        testToken.identityId,
        testToken.tokenData,
      );

      const providerMessage = new clientPB.ProviderMessage();
      providerMessage.setId(testToken.providerId);
      providerMessage.setMessage(testToken.identityId);
      //Technically contains a node, but no other thing, will succeed with no results.
      expect(
        await gestaltsDiscoverIdentity(providerMessage, callCredentials),
      ).toBeInstanceOf(clientPB.EmptyMessage);
    });
    test('should get gestalt permissions by node.', async () => {
      const gestaltsGetActionsByNode =
        grpcUtils.promisifyUnaryCall<clientPB.ActionsMessage>(
          client,
          client.gestaltsGetActionsByNode,
        );
      await gestaltGraph.setNode(node1);
      await gestaltGraph.setNode(node2);
      await gestaltGraph.setGestaltActionByNode(node2.id, 'scan');
      await gestaltGraph.setGestaltActionByNode(node2.id, 'notify');

      const nodeMessage = new clientPB.NodeMessage();

      nodeMessage.setName(node2.id);
      // Should have permissions scan and notify as above.
      const test1 = await gestaltsGetActionsByNode(
        nodeMessage,
        callCredentials,
      );
      expect(test1.getActionList().length).toBe(2);
      expect(test1.getActionList().includes('scan')).toBeTruthy();
      expect(test1.getActionList().includes('notify')).toBeTruthy();

      nodeMessage.setName(nodeId);
      // Should have no permissions.
      const test2 = await gestaltsGetActionsByNode(
        nodeMessage,
        callCredentials,
      );
      expect(test2.getActionList().length).toBe(0);
    });
    test('should get gestalt permissions by Identity.', async () => {
      const gestaltsGetActionsByIdentity =
        grpcUtils.promisifyUnaryCall<clientPB.ActionsMessage>(
          client,
          client.gestaltsGetActionsByIdentity,
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

      const providerMessage = new clientPB.ProviderMessage();
      providerMessage.setId(identity1.providerId);
      providerMessage.setMessage(identity1.identityId);
      // Should have permissions scan and notify as above.
      const test1 = await gestaltsGetActionsByIdentity(
        providerMessage,
        callCredentials,
      );
      expect(test1.getActionList().length).toBe(2);
      expect(test1.getActionList().includes('scan')).toBeTruthy();
      expect(test1.getActionList().includes('notify')).toBeTruthy();

      providerMessage.setId(identity1.providerId);
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
        grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
          client,
          client.gestaltsSetActionByNode,
        );
      await gestaltGraph.setNode(node1);
      await gestaltGraph.setNode(node2);

      const setActionsMessage = new clientPB.SetActionsMessage();
      const nodeMessage = new clientPB.NodeMessage();
      nodeMessage.setName(node2.id);
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
        grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
          client,
          client.gestaltsSetActionByIdentity,
        );
      await gestaltGraph.setNode(node1);
      await gestaltGraph.setNode(node2);
      await gestaltGraph.setIdentity(identity1);
      await gestaltGraph.linkNodeAndIdentity(node2, identity1);

      const providerMessage = new clientPB.ProviderMessage();
      providerMessage.setId(identity1.providerId);
      providerMessage.setMessage(identity1.identityId);

      const setActionsMessage = new clientPB.SetActionsMessage();
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
        grpcUtils.promisifyUnaryCall<clientPB.ActionsMessage>(
          client,
          client.gestaltsUnsetActionByNode,
        );
      await gestaltGraph.setNode(node1);
      await gestaltGraph.setNode(node2);
      await gestaltGraph.setGestaltActionByNode(node2.id, 'scan');
      await gestaltGraph.setGestaltActionByNode(node2.id, 'notify');

      const nodeMessage = new clientPB.NodeMessage();
      nodeMessage.setName(node2.id);

      const setActionsMessage = new clientPB.SetActionsMessage();
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
        grpcUtils.promisifyUnaryCall<clientPB.ActionsMessage>(
          client,
          client.gestaltsUnsetActionByIdentity,
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

      const providerMessage = new clientPB.ProviderMessage();
      providerMessage.setId(identity1.providerId);
      providerMessage.setMessage(identity1.identityId);

      const setActionsMessage = new clientPB.SetActionsMessage();
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
      const nodesAdd = grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
        client,
        client.nodesAdd,
      );
      const nodeId = 'A'.repeat(43) + '=';
      const host = '127.0.0.1';
      const port = 11111;
      const nodeAddressMessage = new clientPB.NodeAddressMessage();
      nodeAddressMessage.setId(nodeId);
      nodeAddressMessage.setHost(host);
      nodeAddressMessage.setPort(port);
      await nodesAdd(nodeAddressMessage, callCredentials);
      const nodeAddress = await nodeManager.getNode(nodeId as NodeId);
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
        const nodesPing = grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
          client,
          client.nodesPing,
        );
        const nodeMessage = new clientPB.NodeMessage();
        nodeMessage.setName(serverNodeId);
        const res1 = await nodesPing(nodeMessage, callCredentials);
        expect(res1.getSuccess()).toEqual(false);

        // Case 2: can establish new connection, so online
        await server2.start({ password: 'password' });
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
    ); // ping needs to timeout, so longer test timeout required
    test('should find a node (local)', async () => {
      const nodesFind =
        grpcUtils.promisifyUnaryCall<clientPB.NodeAddressMessage>(
          client,
          client.nodesFind,
        );
      // Case 1: node already exists in the local node graph (no contact required)
      const nodeId = 'nodeId' as NodeId;
      const nodeAddress: NodeAddress = {
        ip: '127.0.0.1' as Host,
        port: 11111 as Port,
      };
      await nodeManager.setNode(nodeId, nodeAddress);

      const nodeMessage = new clientPB.NodeMessage();
      nodeMessage.setName(nodeId);
      const res = await nodesFind(nodeMessage, callCredentials);
      expect(res.getId()).toEqual(nodeId);
      expect(res.getHost()).toEqual(nodeAddress.ip);
      expect(res.getPort()).toEqual(nodeAddress.port);
    });
    test('should find a node (contacts remote node)', async () => {
      // Case 2: node can be found on the remote node
      const nodeId = 'nodeId' as NodeId;
      const nodeAddress: NodeAddress = {
        ip: '127.0.0.1' as Host,
        port: 11111 as Port,
      };
      await server.nodes.setNode(nodeId, nodeAddress);
      const nodesFind =
        grpcUtils.promisifyUnaryCall<clientPB.NodeAddressMessage>(
          client,
          client.nodesFind,
        );
      const nodeMessage = new clientPB.NodeMessage();
      nodeMessage.setName(nodeId);
      const res = await nodesFind(nodeMessage, callCredentials);
      expect(res.getId()).toEqual(nodeId);
      expect(res.getHost()).toEqual(nodeAddress.ip);
      expect(res.getPort()).toEqual(nodeAddress.port);
    });
    test(
      'should fail to find a node (contacts remote node)',
      async () => {
        // Case 3: node exhausts all contacts and cannot find node
        const nodeId = 'unfindableNode' as NodeId;
        // Add a single dummy node to the server node graph database
        // Server will not be able to connect to this node (the only node in its
        // database), and will therefore not be able to locate the node.
        await server.nodes.setNode(
          'dummyNode' as NodeId,
          {
            ip: '127.0.0.2' as Host,
            port: 22222 as Port,
          } as NodeAddress,
        );
        const nodesFind =
          grpcUtils.promisifyUnaryCall<clientPB.NodeAddressMessage>(
            client,
            client.nodesFind,
          );
        const nodeMessage = new clientPB.NodeMessage();
        nodeMessage.setName(nodeId);
        // So unfindableNode cannot be found
        await expect(nodesFind(nodeMessage, callCredentials)).rejects.toThrow(
          nodesErrors.ErrorNodeGraphNodeNotFound,
        );
      },
      global.failedConnectionTimeout * 2,
    );
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
    });
    test('should send notifications.', async () => {
      // Set up a remote node receiver and add its details to agent

      await testKeynodeUtils.addRemoteDetails(polykeyAgent, receiver);

      const notificationsSend =
        grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
          client,
          client.notificationsSend,
        );

      const notificationInfoMessage = new clientPB.NotificationInfoMessage();
      notificationInfoMessage.setReceiverId(receiver.nodes.getNodeId());
      notificationInfoMessage.setMessage('msg');

      // Send notification returns nothing - check remote node received messages
      await notificationsSend(notificationInfoMessage, callCredentials);
      const notifs = await receiver.notifications.readNotifications();
      expect(notifs).toEqual(['msg']);
    });
    test('should read all notifications.', async () => {
      // Set up a remote node sender

      await sender.notifications.sendNotification(node1.id, 'msg1');
      await sender.notifications.sendNotification(node1.id, 'msg2');
      await sender.notifications.sendNotification(node1.id, 'msg3');

      const notificationsRead =
        grpcUtils.promisifyUnaryCall<clientPB.NotificationListMessage>(
          client,
          client.notificationsRead,
        );

      const notificationDisplayMessage =
        new clientPB.NotificationDisplayMessage();
      const numberMessage = new clientPB.NumberMessage();
      numberMessage.setAll('all');
      notificationDisplayMessage.setUnread(false);
      notificationDisplayMessage.setNumber(numberMessage);
      notificationDisplayMessage.setOrder('newest');

      // Check the read call
      const response = await notificationsRead(
        notificationDisplayMessage,
        callCredentials,
      );
      expect(response.getMessages()).toContain('msg1');
      expect(response.getMessages()).toContain('msg2');
      expect(response.getMessages()).toContain('msg3');
    });
    test('should read a single notification.', async () => {
      await sender.notifications.sendNotification(node1.id, 'msg1');
      await sender.notifications.sendNotification(node1.id, 'msg2');
      await sender.notifications.sendNotification(node1.id, 'msg3');

      const notificationsRead =
        grpcUtils.promisifyUnaryCall<clientPB.NotificationListMessage>(
          client,
          client.notificationsRead,
        );

      const notificationDisplayMessage =
        new clientPB.NotificationDisplayMessage();
      const numberMessage = new clientPB.NumberMessage();
      numberMessage.setNumber(1);
      notificationDisplayMessage.setUnread(false);
      notificationDisplayMessage.setNumber(numberMessage);
      notificationDisplayMessage.setOrder('newest');

      // Check the read call
      const response = await notificationsRead(
        notificationDisplayMessage,
        callCredentials,
      );
      expect(response.getMessages()).not.toContain('msg1');
      expect(response.getMessages()).not.toContain('msg2');
      expect(response.getMessages()).toContain('msg3');
    });
    test('should clear all notifications.', async () => {
      await sender.notifications.sendNotification(node1.id, 'msg1');
      await sender.notifications.sendNotification(node1.id, 'msg2');

      const notificationsClear =
        grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
          client,
          client.notificationsClear,
        );

      const emptyMessage = new clientPB.EmptyMessage();
      await notificationsClear(emptyMessage, callCredentials);

      // Call read notifications to check there are none
      const notifs = await polykeyAgent.notifications.readNotifications();
      expect(notifs).toEqual([]);
    });
  });
});
