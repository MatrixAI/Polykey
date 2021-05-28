import os from 'os';
import path from 'path';
import git from 'isomorphic-git';
import fs from 'fs';
import * as grpc from '@grpc/grpc-js';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import * as utils from './utils';
import * as grpcUtils from '@/grpc/utils';
import * as errors from '@/vaults/errors';
import * as agentPB from '@/proto/js/Agent_pb';

import { NodeManager } from '@/nodes';
import { AgentService, createAgentService } from '@/agent';
import { GitFrontend, GitBackend } from '@/git';
import { IAgentServer, AgentClient } from '@/proto/js/Agent_grpc_pb';

import KeyManager from '@/keys/KeyManager';
import VaultManager from '@/vaults/VaultManager';
import { ForwardProxy, ReverseProxy } from '@/network';

const logger = new Logger('GitRequest Test', LogLevel.WARN, [
  new StreamHandler(),
]);

describe('GRPC can use GitRequest and', () => {
  let client: AgentClient;
  let server: grpc.Server;
  let port: number;
  let dataDir: string;
  let dataDir2: string;
  let vaultManager: VaultManager;
  let keyManager: KeyManager;
  let nodeManager: NodeManager;
  let gitB: GitBackend;

  let fwdProxy: ForwardProxy;
  let revProxy: ReverseProxy;

  const name = 'vault-1';
  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    dataDir2 = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    await fs.promises.mkdir(path.join(dataDir, 'cloneVault'));

    fwdProxy = new ForwardProxy({
      authToken: 'abc',
      logger: logger,
    });

    revProxy = new ReverseProxy({
      logger: logger,
    });

    keyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
      logger: logger,
    });
    vaultManager = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    gitB = new GitBackend({
      getVault: vaultManager.getVault.bind(vaultManager),
      getVaultID: vaultManager.getVaultIds.bind(vaultManager),
      getVaultNames: vaultManager.listVaults.bind(vaultManager),
      logger: logger,
    });
    nodeManager = new NodeManager({
      nodesPath: path.join(dataDir, 'nodes'),
      keyManager: keyManager,
      fwdProxy: fwdProxy,
      revProxy: revProxy,
      fs: fs,
      logger: logger,
    });
    const agentService: IAgentServer = createAgentService({
      keyManager: keyManager,
      vaultManager: vaultManager,
      nodeManager: nodeManager,
      gitBackend: gitB,
    });
    [server, port] = await utils.openGrpcServer(AgentService, agentService);
    client = await utils.openGrpcClient(port);
  });
  afterAll(async () => {
    utils.closeGrpcClient(client);
    await utils.closeGrpcServer(server);
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    await fs.promises.rm(dataDir2, {
      force: true,
      recursive: true,
    });
  });

  test('Echo', async () => {
    const unary = grpcUtils.promisifyUnaryCall<agentPB.EchoMessage>(
      client,
      client.echo,
    );
    const echoMessage = new agentPB.EchoMessage();
    echoMessage.setChallenge('ECHO');

    const pCall = unary(echoMessage);
    const response = await pCall;
    expect(response.getChallenge()).toBe(echoMessage.getChallenge());
  });
  test('cloning and pulling over grpc', async () => {
    jest.setTimeout(1000000);
    const keyManager2 = new KeyManager({
      keysPath: path.join(dataDir2, 'keys'),
      fs: fs,
      logger: logger,
    });
    const vaultManager2 = new VaultManager({
      vaultsPath: path.join(dataDir2, 'vaults'),
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });
    await keyManager.start({ password: 'password' });
    await vaultManager.start({});
    await keyManager2.start({ password: 'password2' });
    await vaultManager2.start({});
    const newVault = await vaultManager.createVault(name);
    await newVault.initializeVault();
    await newVault.addSecret('secret-1', Buffer.from('secret-content'));
    const newVault2 = await vaultManager2.createVault('vault2');
    const gitFront = new GitFrontend();
    const gitRequest = gitFront.connectToNodeGit(client);
    const vaultUrl = `http://0.0.0.0/${name}`;
    await git.clone({
      fs: newVault2.EncryptedFS,
      http: gitRequest,
      dir: newVault2.vaultId,
      url: vaultUrl,
      ref: 'master',
      singleBranch: true,
    });
    await git.setConfig({
      fs: newVault2.EncryptedFS,
      dir: newVault2.vaultId,
      path: 'user.name',
      value: newVault2.vaultName,
    });
    expect(await newVault2.listSecrets()).toStrictEqual(['secret-1']);
    expect(await newVault2.getSecret('secret-1')).toStrictEqual(
      Buffer.from('secret-content'),
    );
    expect(await gitRequest.scanVaults()).toStrictEqual([name]);
    await newVault.updateSecret('secret-1', Buffer.from('secret-change'));
    await git.pull({
      fs: newVault2.EncryptedFS,
      http: gitRequest,
      dir: newVault2.vaultId,
      ref: 'master',
      singleBranch: true,
    });
    expect(await newVault2.getSecret('secret-1')).toStrictEqual(
      Buffer.from('secret-change'),
    );
    await newVault.updateSecret(
      'secret-1',
      Buffer.from('secret-change-change'),
    );
    await git.pull({
      fs: newVault2.EncryptedFS,
      http: gitRequest,
      dir: newVault2.vaultId,
      ref: 'master',
      singleBranch: true,
    });
    expect(await newVault2.getSecret('secret-1')).toStrictEqual(
      Buffer.from('secret-change-change'),
    );
    const secretsList = ['secret-1'];
    for (let i = 2; i < 10; i++) {
      await newVault.addSecret(
        'secret-' + i.toString(),
        Buffer.from('secret-content-' + i.toString()),
      );
      await git.pull({
        fs: newVault2.EncryptedFS,
        http: gitRequest,
        dir: newVault2.vaultId,
        ref: 'master',
        singleBranch: true,
      });
      secretsList.push('secret-' + i.toString());
    }
    expect((await newVault2.listSecrets()).sort()).toStrictEqual(
      secretsList.sort(),
    );
    expect(
      await git.currentBranch({
        fs: newVault2.EncryptedFS,
        dir: newVault2.vaultId,
      }),
    ).toBe('master');
    await newVault2.addSecret(
      'secret-vault2only',
      Buffer.from('this is only in vault2'),
    );
    expect(
      await git.currentBranch({
        fs: newVault2.EncryptedFS,
        dir: newVault2.vaultId,
      }),
    ).toBe('changes');
    await newVault.addSecret(
      'secret-vaultonly',
      Buffer.from('this is only in vault'),
    );
    expect(
      await git.currentBranch({
        fs: newVault.EncryptedFS,
        dir: newVault.vaultId,
      }),
    ).toBe('master');
    await expect(newVault2.pullVault(gitRequest)).rejects.toThrow(
      errors.ErrorVaultModified,
    );
    await vaultManager.stop();
    await keyManager.stop();
    await vaultManager2.stop();
    await keyManager2.stop();
  });
});
