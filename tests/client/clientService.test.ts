import type { Vault } from '@/vaults';
import type { Claim } from '@/sigchain/types';
import type { NodeId, NodeInfo } from '@/nodes/types';
import type { IdentityId, IdentityInfo, ProviderId } from '@/identities/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import * as grpc from '@grpc/grpc-js';

import { clientPB } from '@/client';
import { NodeManager } from '@/nodes';
import { GestaltGraph } from '@/gestalts';
import { VaultManager } from '@/vaults';
import { IdentitiesManager } from '@/identities';
import { ACL } from '@/acl';
import { GitManager } from '@/git';
import { KeyManager, utils as keyUtils } from '@/keys';
import { ClientClient } from '@/proto/js/Client_grpc_pb';
import { ForwardProxy, ReverseProxy, utils as networkUtils } from '@/network';
import { DB } from '@/db';
import { PolykeyAgent } from '@';

import * as utils from '@/utils';
import * as testUtils from './utils';
import * as grpcUtils from '@/grpc/utils';
import * as gestaltsUtils from '@/gestalts/utils';
import * as polykeyErrors from '@/errors';
import * as vaultErrors from '@/vaults/errors';

describe('Client service', () => {
  const logger = new Logger('ClientServerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let client: ClientClient;
  let server: grpc.Server;
  let port: number;

  let dataDir: string;
  let keysPath: string;
  let nodesPath: string;
  let vaultsPath: string;
  let identitiesPath: string;
  let dbPath: string;

  let polykeyAgent: PolykeyAgent;
  let keyManager: KeyManager;
  let gitManager: GitManager;
  let nodeManager: NodeManager;
  let vaultManager: VaultManager;
  let gestaltGraph: GestaltGraph;
  let identitiesManager: IdentitiesManager;
  let acl: ACL;
  let db: DB;

  let passwordFile: string;

  let fwdProxy: ForwardProxy;
  let revProxy: ReverseProxy;

  let nodeId: NodeId;

  let callCredentials: Partial<grpc.CallOptions>;

  beforeAll(async () => {
    const keyPair = await keyUtils.generateKeyPair(4096);
    const cert = keyUtils.generateCertificate(
      keyPair.publicKey,
      keyPair.privateKey,
      keyPair.privateKey,
      86400,
    );
    nodeId = networkUtils.certNodeId(cert);
  });

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    keysPath = path.join(dataDir, 'keys');
    nodesPath = path.join(dataDir, 'nodes');
    vaultsPath = path.join(dataDir, 'vaults');
    identitiesPath = path.join(dataDir, 'identities');
    dbPath = path.join(dataDir, 'db');

    passwordFile = path.join(dataDir, 'password');
    await fs.promises.writeFile(passwordFile, 'password');

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

    vaultManager = new VaultManager({
      vaultsPath: vaultsPath,
      keyManager: keyManager,
      db: db,
      acl: acl,
      gestaltGraph: gestaltGraph,
      fs: fs,
      logger: logger,
    });

    nodeManager = new NodeManager({
      nodesPath: nodesPath,
      keyManager: keyManager,
      fwdProxy: fwdProxy,
      revProxy: revProxy,
      fs: fs,
      logger: logger,
    });

    identitiesManager = new IdentitiesManager({
      db: db,
      logger: logger,
    });

    gitManager = new GitManager({
      vaultManager: vaultManager,
      nodeManager: nodeManager,
    });

    polykeyAgent = new PolykeyAgent({
      nodePath: dataDir,
      keyManager: keyManager,
      vaultManager: vaultManager,
      nodeManager: nodeManager,
      gestaltGraph: gestaltGraph,
      identitiesManager: identitiesManager,
      acl: acl,
      db: db,
      gitManager: gitManager,
      fwdProxy: fwdProxy,
      revProxy: revProxy,
      fs: fs,
      logger: logger,
    });

    await polykeyAgent.keys.start({ password: 'password' });
    await polykeyAgent.db.start({ keyPair: keyManager.getRootKeyPair() });
    await polykeyAgent.acl.start();
    await polykeyAgent.vaults.start({});
    await polykeyAgent.nodes.start({ nodeId: nodeId });
    await polykeyAgent.identities.start();
    await polykeyAgent.gestalts.start();
    await polykeyAgent.gitManager.start();
    await polykeyAgent.sessions.start({ bits: 4069 });

    [server, port] = await testUtils.openTestClientServer({
      polykeyAgent,
    });

    client = await testUtils.openSimpleClientClient(port);

    const token = await polykeyAgent.sessions.generateJWTToken();
    callCredentials = {
      credentials: grpc.CallCredentials.createFromMetadataGenerator(
        (_params, callback) => {
          const meta = new grpc.Metadata();
          meta.add('Authorization', `Bearer: ${token}`);
          callback(null, meta);
        },
      ),
    };
  });

  afterEach(async () => {
    await testUtils.closeTestClientServer(server);
    testUtils.closeSimpleClientClient(client);

    await polykeyAgent.sessions.stop();
    await polykeyAgent.gitManager.stop();
    await polykeyAgent.gestalts.stop();
    await polykeyAgent.identities.stop();
    await polykeyAgent.nodes.stop();
    await polykeyAgent.vaults.stop();
    await polykeyAgent.acl.stop();
    await polykeyAgent.db.stop();
    await polykeyAgent.keys.stop();

    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  afterAll(async () => {
    await fs.promises.rm(passwordFile);
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
  test('can request JWT', async () => {
    const requestJWT = grpcUtils.promisifyUnaryCall<clientPB.JWTTokenMessage>(
      client,
      client.sessionRequestJWT,
    );

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);

    const m = new clientPB.EmptyMessage();

    const res = await requestJWT(m, meta);
    expect(typeof res.getToken()).toBe('string');
    const result = await polykeyAgent.sessions.verifyJWTToken(
      res.getToken() as Claim,
    );
    expect(result).toBeTruthy();
  });
  test('can get vaults', async () => {
    const listVaults =
      grpcUtils.promisifyReadableStreamCall<clientPB.VaultMessage>(
        client,
        client.vaultsList,
      );

    const vaultList = ['Vault1', 'Vault2', 'Vault3', 'Vault4', 'Vault5'];

    for (const vaultName of vaultList) {
      vaultManager.createVault(vaultName);
    }

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);

    const m = new clientPB.EmptyMessage();
    const res = listVaults(m, meta, callCredentials);
    const names: Array<string> = [];
    for await (const val of res) {
      names.push(val.getName());
    }

    expect(names.sort()).toStrictEqual(vaultList.sort());
  });
  test('can create vault', async () => {
    const createVault = grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      client,
      client.vaultsCreate,
    );

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);

    const m = new clientPB.VaultMessage();
    m.setName('NewVault');

    const res = await createVault(m, meta, callCredentials);
    expect(res.getSuccess()).toBe(true);
    const name = vaultManager.listVaults().pop()?.name;
    expect(name).toBe('NewVault');
  });
  test('can delete vaults', async () => {
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

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);

    const m = new clientPB.VaultMessage();
    m.setName(vaults[0].vaultId);

    const res = await deleteVault(m, meta, callCredentials);
    expect(res.getSuccess()).toBe(true);

    const list: Array<string> = [];
    const listVaults = vaultManager.listVaults().sort();
    for (const vault of listVaults) {
      list.push(vault.name);
    }
    expect(list).toStrictEqual(vaultList2.sort());

    await expect(deleteVault(m, meta, callCredentials)).rejects.toThrow(
      vaultErrors.ErrorVaultUndefined,
    );
  });
  test('can rename vaults', async () => {
    const renameVault = grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      client,
      client.vaultsRename,
    );

    const vault = await vaultManager.createVault('MyFirstVault');

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);

    const m = new clientPB.VaultMessage();
    m.setId(vault.vaultId);
    m.setName('MyRenamedVault');

    const res = await renameVault(m, meta, callCredentials);
    expect(res.getSuccess()).toBe(true);

    const name = vaultManager.listVaults().pop()?.name;
    expect(name).toBe('MyRenamedVault');
  });
  test('can get stats for vaults', async () => {
    const statsVault = grpcUtils.promisifyUnaryCall<clientPB.StatMessage>(
      client,
      client.vaultsStat,
    );

    const vault = await vaultManager.createVault('MyFirstVault');
    const vault2 = await vaultManager.createVault('MySecondVault');

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);

    const m = new clientPB.VaultMessage();
    m.setName(vault.vaultId);

    const res = await statsVault(m, meta, callCredentials);
    const stats1 = res.getStats();

    m.setName(vault2.vaultId);
    const res2 = await statsVault(m, meta, callCredentials);
    const stats2 = res2.getStats();

    expect(stats1).toBe(
      JSON.stringify(await vaultManager.vaultStats(vault.vaultId)),
    );
    expect(stats2).toBe(
      JSON.stringify(await vaultManager.vaultStats(vault2.vaultId)),
    );
  });
  test('can make a directory in a vault', async () => {
    const mkdirVault = grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      client,
      client.vaultsMkdir,
    );

    const vault = await vaultManager.createVault('MyFirstVault');
    await vault.initializeVault();
    const dirPath = 'dir/dir1/dir2';

    const m = new clientPB.VaultSpecificMessage();
    const mv = new clientPB.VaultMessage();
    mv.setName(vault.vaultName);
    m.setVault(mv);
    m.setName(dirPath);

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);
    await mkdirVault(m, meta, callCredentials);

    expect(
      vault.EncryptedFS.existsSync(`${vault.vaultId}/${dirPath}`),
    ).toBeTruthy();
  });
  test('can list secrets in a vault', async () => {
    const listSecretsVault =
      grpcUtils.promisifyReadableStreamCall<clientPB.SecretMessage>(
        client,
        client.vaultsListSecrets,
      );

    const vault = await vaultManager.createVault('MyFirstVault');
    await vault.initializeVault();

    const secretList = ['Secret1', 'Secret2', 'Secret3', 'Secret4', 'Secret5'];

    for (const secretName of secretList) {
      await vault.addSecret(secretName, Buffer.from(secretName));
    }

    const m = new clientPB.VaultMessage();
    m.setName(vault.vaultName);

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);
    const res = listSecretsVault(m, meta, callCredentials);

    const names: Array<string> = [];
    for await (const val of res) {
      names.push(val.getName());
    }

    expect(names.sort()).toStrictEqual(secretList.sort());
  });
  test('can delete secrets in a vault', async () => {
    const deleteSecretVault =
      grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
        client,
        client.vaultsDeleteSecret,
      );

    const vault = await vaultManager.createVault('MyFirstVault');
    await vault.initializeVault();

    const secretList = ['Secret1', 'Secret2', 'Secret3', 'Secret4', 'Secret5'];
    const secretList2 = ['Secret2', 'Secret3', 'Secret4', 'Secret5'];

    for (const secretName of secretList) {
      await vault.addSecret(secretName, Buffer.from(secretName));
    }

    const m = new clientPB.VaultSpecificMessage();
    const mv = new clientPB.VaultMessage();
    mv.setName(vault.vaultName);
    m.setVault(mv);
    m.setName('Secret1');

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);
    const res = await deleteSecretVault(m, meta, callCredentials);
    expect(res.getSuccess()).toBeTruthy();

    expect((await vault.listSecrets()).sort()).toStrictEqual(
      secretList2.sort(),
    );
  });
  test('can edit secrets in a vault', async () => {
    const editSecretVault = grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      client,
      client.vaultsEditSecret,
    );

    const vault = await vaultManager.createVault('MyFirstVault');
    await vault.initializeVault();

    const secretList = ['Secret1', 'Secret2', 'Secret3', 'Secret4', 'Secret5'];

    for (const secretName of secretList) {
      await vault.addSecret(secretName, Buffer.from(secretName));
    }

    const m = new clientPB.SecretSpecificMessage();
    const mv = new clientPB.VaultSpecificMessage();
    const mvs = new clientPB.VaultMessage();
    mvs.setName(vault.vaultName);
    mv.setVault(mvs);
    mv.setName('Secret1');
    m.setContent('content-change');
    m.setVault(mv);

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);
    await editSecretVault(m, meta, callCredentials);

    expect((await vault.getSecret('Secret1')).toString()).toStrictEqual(
      'content-change',
    );
  });
  test('can get secrets in a vault', async () => {
    const getSecretVault = grpcUtils.promisifyUnaryCall<clientPB.SecretMessage>(
      client,
      client.vaultsGetSecret,
    );

    const vault = await vaultManager.createVault('MyFirstVault');
    await vault.initializeVault();

    const secretList = ['Secret1', 'Secret2', 'Secret3', 'Secret4', 'Secret5'];

    for (const secretName of secretList) {
      await vault.addSecret(secretName, Buffer.from(secretName));
    }

    const m = new clientPB.VaultSpecificMessage();
    const mv = new clientPB.VaultMessage();
    mv.setName(vault.vaultName);
    m.setVault(mv);
    m.setName('Secret1');

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);
    const response = await getSecretVault(m, meta, callCredentials);

    expect(response.getName().toString()).toStrictEqual('Secret1');
  });
  test('can rename secrets in a vault', async () => {
    const renameSecretVault =
      grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
        client,
        client.vaultsRenameSecret,
      );

    const vault = await vaultManager.createVault('MyFirstVault');
    await vault.initializeVault();

    const secretList = ['Secret1', 'Secret2', 'Secret3', 'Secret4', 'Secret5'];
    const secretList2 = ['Secret2', 'Secret3', 'Secret4', 'Secret5', 'Secret6'];

    for (const secretName of secretList) {
      await vault.addSecret(secretName, Buffer.from(secretName));
    }

    const m = new clientPB.SecretRenameMessage();
    const mv = new clientPB.VaultMessage();
    const mos = new clientPB.SecretMessage();
    const mns = new clientPB.SecretMessage();

    mv.setName(vault.vaultName);
    mos.setName('Secret1');
    mns.setName('Secret6');
    m.setVault(mv);
    m.setOldname(mos);
    m.setNewname(mns);

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);
    const response = await renameSecretVault(m, meta, callCredentials);

    expect(response.getSuccess()).toBeTruthy();
    expect((await vault.listSecrets()).sort()).toStrictEqual(
      secretList2.sort(),
    );
  });
  test('can add secrets in a vault', async () => {
    const newSecretVault = grpcUtils.promisifyUnaryCall<clientPB.StatusMessage>(
      client,
      client.vaultsNewSecret,
    );

    const vault = await vaultManager.createVault('MyFirstVault');
    await vault.initializeVault();

    const m = new clientPB.SecretNewMessage();
    const mv = new clientPB.VaultMessage();
    mv.setName(vault.vaultName);
    m.setVault(mv);
    m.setName('Secret1');
    m.setContent('secret-content');

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);
    const response = await newSecretVault(m, meta, callCredentials);

    expect(response.getSuccess()).toBeTruthy();
    expect((await vault.listSecrets()).sort()).toStrictEqual(['Secret1']);
    expect((await vault.getSecret('Secret1')).toString()).toStrictEqual(
      'secret-content',
    );
  });
  test('can add a directory of secrets in a vault', async () => {
    const newDirSecretVault =
      grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
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
    await vault.initializeVault();

    const m = new clientPB.SecretNewMessage();
    const mv = new clientPB.VaultMessage();
    mv.setName(vault.vaultName);
    m.setVault(mv);
    m.setName(tmpDir);

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);
    await newDirSecretVault(m, meta, callCredentials);

    expect((await vault.listSecrets()).sort()).toStrictEqual(secrets.sort());

    // remove temp directory
    await fs.promises.rmdir(tmpDir, { recursive: true });
  });
  test('can get root keypair', async () => {
    const getRootKeyPair =
      grpcUtils.promisifyUnaryCall<clientPB.KeyPairMessage>(
        client,
        client.keysRootKeyPair,
      );

    const keyPair = await keyManager.getRootKeyPairPem();

    const m = new clientPB.EmptyMessage();

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);

    const key = await getRootKeyPair(m, meta, callCredentials);

    expect(key.getPrivate()).toBe(keyPair.privateKey);
    expect(key.getPublic()).toBe(keyPair.publicKey);
  });
  test('can reset root keypair', async () => {
    const getRootKeyPair =
      grpcUtils.promisifyUnaryCall<clientPB.KeyPairMessage>(
        client,
        client.keysRootKeyPair,
      );

    const resetKeyPair = grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      client,
      client.keysResetKeyPair,
    );

    const keyPair = await keyManager.getRootKeyPairPem();

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);

    const m = new clientPB.KeyMessage();
    m.setName('somepassphrase');

    await resetKeyPair(m, meta, callCredentials);

    const mv = new clientPB.EmptyMessage();

    await fs.promises.writeFile(passwordFile, 'somepassphrase');

    const key = await getRootKeyPair(mv, meta, callCredentials);

    expect(key.getPrivate()).not.toBe(keyPair.privateKey);
    expect(key.getPublic()).not.toBe(keyPair.publicKey);
  });
  test('can renew root keypair', async () => {
    const renewKeyPair = grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      client,
      client.keysRenewKeyPair,
    );

    const rootKeyPair1 = await keyManager.getRootKeyPairPem();

    const m = new clientPB.KeyMessage();
    m.setName('somepassphrase');

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);

    await renewKeyPair(m, meta, callCredentials);

    const rootKeyPair2 = keyManager.getRootKeyPairPem();

    expect(rootKeyPair2.privateKey).not.toBe(rootKeyPair1.privateKey);
    expect(rootKeyPair2.publicKey).not.toBe(rootKeyPair1.publicKey);
  });
  test('can encrypt and decrypt with root keypair', async () => {
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

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);

    const cipherText = await encryptWithKeyPair(
      cryptoMessage,
      meta,
      callCredentials,
    );

    cryptoMessage.setData(cipherText.getData());
    const plainText_ = await decryptWithKeyPair(
      cryptoMessage,
      meta,
      callCredentials,
    );

    expect(plainText_.getData()).toBe(plainText.toString());
  });
  test('can encrypt and decrypt with root keypair', async () => {
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

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);

    const signature = await signWithKeyPair(
      cryptoMessage,
      meta,
      callCredentials,
    );

    cryptoMessage.setSignature(signature.getSignature());

    const signed = await verifyWithKeyPair(
      cryptoMessage,
      meta,
      callCredentials,
    );

    expect(signed.getSuccess()).toBe(true);
  });
  test('can change password', async () => {
    const changePasswordKeys =
      grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
        client,
        client.keysChangePassword,
      );

    const m = new clientPB.PasswordMessage();
    m.setPassword('newpassword');

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);

    await changePasswordKeys(m, meta, callCredentials);

    await nodeManager.stop();
    await vaultManager.stop();
    await keyManager.stop();

    await expect(keyManager.start({ password: 'password' })).rejects.toThrow();
  });
  test('can get the root certificate and chains', async () => {
    const getCerts = grpcUtils.promisifyUnaryCall<clientPB.CertificateMessage>(
      client,
      client.certsGet,
    );

    const getChainCerts =
      grpcUtils.promisifyReadableStreamCall<clientPB.CertificateMessage>(
        client,
        client.certsChainGet,
      );

    const m = new clientPB.EmptyMessage();

    const meta = new grpc.Metadata();
    meta.set('passwordFile', passwordFile);

    const res = getChainCerts(m, meta, callCredentials);
    const certs: Array<string> = [];
    for await (const val of res) {
      certs.push(val.getCert());
    }

    expect(certs.sort()).toStrictEqual(
      (await keyManager.getRootCertChainPems()).sort(),
    );

    const response = await getCerts(m, meta, callCredentials);

    expect(response.getCert()).toBe(keyManager.getRootCertPem());
  });
  test('getting all gestalts', async () => {
    const listGestalts =
      grpcUtils.promisifyReadableStreamCall<clientPB.GestaltMessage>(
        client,
        client.gestaltsList,
      );

    const nodeInfo: NodeInfo = {
      id: 'abc' as NodeId,
      links: {
        nodes: {},
        identities: {},
      },
    };
    await gestaltGraph.setNode(nodeInfo);
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      links: {
        nodes: {},
      },
    };
    await gestaltGraph.setIdentity(identityInfo);

    const m = new clientPB.EmptyMessage();

    const res = listGestalts(m);

    const gestalts: Array<string> = [];
    for await (const val of res) {
      gestalts.push(JSON.parse(val.getName()));
    }
    const identityGestalt = await gestaltGraph.getGestaltByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    const nodeGestalt = await gestaltGraph.getGestaltByNode(nodeInfo.id);
    expect(gestalts).toContainEqual(identityGestalt);
    expect(gestalts).toContainEqual(nodeGestalt);
    expect(gestalts).toHaveLength(2);
  });
  test('setting independent node and identity gestalts', async () => {
    const nodeInfo: NodeInfo = {
      id: 'abc' as NodeId,
      links: {
        nodes: {},
        identities: {},
      },
    };
    const identityInfo: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      links: {
        nodes: {},
      },
    };
    await gestaltGraph.setNode(nodeInfo);
    await gestaltGraph.setIdentity(identityInfo);
    const gestaltNode = await gestaltGraph.getGestaltByNode(nodeInfo.id);
    const gestaltIdentity = await gestaltGraph.getGestaltByIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    const gkNode = gestaltsUtils.keyFromNode(nodeInfo.id);
    const gkIdentity = gestaltsUtils.keyFromIdentity(
      identityInfo.providerId,
      identityInfo.identityId,
    );
    expect(gestaltNode).toStrictEqual({
      matrix: { [gkNode]: {} },
      nodes: { [gkNode]: nodeInfo },
      identities: {},
    });
    expect(gestaltIdentity).toStrictEqual({
      matrix: { [gkIdentity]: {} },
      nodes: {},
      identities: { [gkIdentity]: identityInfo },
    });
  });
  test('token manipulation for providers', async () => {
    const putToken = grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      client,
      client.tokensPut,
    );

    const getTokens = grpcUtils.promisifyUnaryCall<clientPB.TokenMessage>(
      client,
      client.tokensGet,
    );

    const delToken = grpcUtils.promisifyUnaryCall<clientPB.EmptyMessage>(
      client,
      client.tokensDelete,
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

    await putToken(m);

    const tokenData_ = await getTokens(mp);
    expect(JSON.stringify(tokenData)).toStrictEqual(tokenData_.getToken());

    await delToken(mp);
    await delToken(mp);
    const tokenData__ = await getTokens(mp);
    expect(tokenData__.getToken()).toBe('');
  });
});
