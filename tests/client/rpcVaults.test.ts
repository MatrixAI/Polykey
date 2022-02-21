import type * as grpc from '@grpc/grpc-js';
import type { VaultManager } from '@/vaults';
import type { VaultId, VaultName } from '@/vaults/types';
import type { ClientServiceClient } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import type { Stat } from 'encryptedfs';
import type * as permissionsPB from '@/proto/js/polykey/v1/permissions/permissions_pb';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as vaultsPB from '@/proto/js/polykey/v1/vaults/vaults_pb';
import * as secretsPB from '@/proto/js/polykey/v1/secrets/secrets_pb';
import { KeyManager } from '@/keys';
import { ForwardProxy } from '@/network';
import * as grpcUtils from '@/grpc/utils';
import * as vaultErrors from '@/vaults/errors';
import * as vaultsUtils from '@/vaults/utils';
import { vaultOps } from '@/vaults';
import * as nodesUtils from '@/nodes/utils';
import * as clientUtils from './utils';

jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

describe('Vaults client service', () => {
  const password = 'password';
  const logger = new Logger('VaultsClientServerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const vaultList = [
    'Vault1' as VaultName,
    'Vault2' as VaultName,
    'Vault3' as VaultName,
    'Vault4' as VaultName,
  ];
  const secretList = ['Secret1', 'Secret2', 'Secret3', 'Secret4'];

  let client: ClientServiceClient;
  let server: grpc.Server;
  let port: number;
  let dataDir: string;
  let pkAgent: PolykeyAgent;
  let keyManager: KeyManager;
  let vaultManager: VaultManager;
  let passwordFile: string;
  let callCredentials: grpc.Metadata;

  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );

    passwordFile = path.join(dataDir, 'password');
    await fs.promises.writeFile(passwordFile, 'password');
    const keysPath = path.join(dataDir, 'keys');

    keyManager = await KeyManager.createKeyManager({
      keysPath,
      password,
      logger,
    });

    const fwdProxy = new ForwardProxy({
      authToken: 'abc',
      logger: logger,
    });

    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: dataDir,
      logger,
      fwdProxy,
      keyManager,
    });

    vaultManager = pkAgent.vaultManager;

    [server, port] = await clientUtils.openTestClientServer({
      pkAgent,
      secure: false,
    });

    client = await clientUtils.openSimpleClientClient(port);
  }, global.polykeyStartupTimeout);
  afterAll(async () => {
    await clientUtils.closeTestClientServer(server);
    clientUtils.closeSimpleClientClient(client);

    await pkAgent.stop();
    await pkAgent.destroy();

    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    await fs.promises.rm(passwordFile);
  });
  beforeEach(async () => {
    const sessionToken = await pkAgent.sessionManager.createToken();
    callCredentials = clientUtils.createCallCredentials(sessionToken);
  });
  afterEach(async () => {
    const aliveVaults = await vaultManager.listVaults();
    for (const vaultId of aliveVaults.values()) {
      await vaultManager.destroyVault(vaultId);
    }
  });

  describe('Vaults', () => {
    test('should get vaults', async () => {
      const listVaults = grpcUtils.promisifyReadableStreamCall<vaultsPB.List>(
        client,
        client.vaultsList,
      );
      for (const vaultName of vaultList) {
        await vaultManager.createVault(vaultName);
      }
      const emptyMessage = new utilsPB.EmptyMessage();
      const vaultStream = listVaults(emptyMessage, callCredentials);
      const names: Array<string> = [];
      for await (const vault of vaultStream) {
        names.push(vault.getVaultName());
      }
      expect(names.sort()).toStrictEqual(vaultList.sort());
    });
    test('should create vault', async () => {
      const createVault = grpcUtils.promisifyUnaryCall<vaultsPB.Vault>(
        client,
        client.vaultsCreate,
      );
      const vaultMessage = new vaultsPB.Vault();
      vaultMessage.setNameOrId(vaultList[0]);
      const vaultId = await createVault(vaultMessage, callCredentials);
      const vaultNames = await vaultManager.listVaults();
      expect(vaultNames.get(vaultList[0])).toBeTruthy();
      expect(
        vaultsUtils.encodeVaultId(vaultNames.get(vaultList[0])!),
      ).toStrictEqual(vaultId.getNameOrId());
    });
    test('should delete vaults', async () => {
      const deleteVault = grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
        client,
        client.vaultsDelete,
      );
      for (const vaultName of vaultList) {
        await vaultManager.createVault(vaultName);
      }
      const vaultMessage = new vaultsPB.Vault();
      vaultMessage.setNameOrId(vaultList[0]);
      await deleteVault(vaultMessage, callCredentials);
      const listVaults = await vaultManager.listVaults();
      const modifiedVaultList: string[] = [];
      for (const [vaultName] of listVaults) {
        modifiedVaultList.push(vaultName);
      }
      expect(modifiedVaultList.sort()).toStrictEqual(vaultList.slice(1).sort());
    });
    test('should rename vaults', async () => {
      const renameVault = grpcUtils.promisifyUnaryCall<vaultsPB.Vault>(
        client,
        client.vaultsRename,
      );
      const vaultId1 = await vaultManager.createVault(vaultList[0]);

      const vaultRenameMessage = new vaultsPB.Rename();
      const vaultMessage = new vaultsPB.Vault();
      vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultId1));
      vaultRenameMessage.setVault(vaultMessage);
      vaultRenameMessage.setNewName(vaultList[1]);

      const vaultId2 = await renameVault(vaultRenameMessage, callCredentials);
      expect(vaultsUtils.decodeVaultId(vaultId2.getNameOrId())).toStrictEqual(
        vaultId1,
      );

      const renamedVaultId = await vaultManager.getVaultId(vaultList[1]);
      expect(renamedVaultId).toEqual(vaultId1);
    });
    describe('Version', () => {
      const secretVer1 = {
        name: secretList[0],
        content: 'Secret-1-content-ver1',
      };
      const secretVer2 = {
        name: secretList[0],
        content: 'Secret-1-content-ver2',
      };
      let vaultId: VaultId;
      let vaultsVersion;

      beforeEach(async () => {
        vaultId = await vaultManager.createVault(vaultList[0]);
        vaultsVersion = grpcUtils.promisifyUnaryCall<vaultsPB.VersionResult>(
          client,
          client.vaultsVersion,
        );
      });

      test('should switch a vault to a version', async () => {
        // Commit some history
        const ver1Oid = await vaultManager.withVaults(
          [vaultId],
          async (vault) => {
            await vault.writeF(async (efs) => {
              await efs.writeFile(secretVer1.name, secretVer1.content);
            });
            const ver1Oid = (await vault.log())[0].commitId;
            await vault.writeF(async (efs) => {
              await efs.writeFile(secretVer2.name, secretVer2.content);
            });
            return ver1Oid;
          },
        );

        // Revert the version
        const vaultMessage = new vaultsPB.Vault();
        vaultMessage.setNameOrId(vaultList[0]);

        const vaultVersionMessage = new vaultsPB.Version();
        vaultVersionMessage.setVault(vaultMessage);
        vaultVersionMessage.setVersionId(ver1Oid);

        const version = await vaultsVersion(
          vaultVersionMessage,
          callCredentials,
        );
        expect(version.getIsLatestVersion()).toBeFalsy();
        // Read old history

        await vaultManager.withVaults([vaultId], async (vault) => {
          await vault.readF(async (efs) => {
            expect(
              (await efs.readFile(secretVer1.name)).toString(),
            ).toStrictEqual(secretVer1.content);
          });
        });
      });
      test('should fail to find a non existent version', async () => {
        // Revert the version
        const vaultMessage = new vaultsPB.Vault();
        vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultId));
        const vaultVersionMessage = new vaultsPB.Version();
        vaultVersionMessage.setVault(vaultMessage);
        vaultVersionMessage.setVersionId('invalidOid');
        const version = vaultsVersion(vaultVersionMessage, callCredentials);
        await expect(version).rejects.toThrow(
          vaultErrors.ErrorVaultReferenceMissing,
        );
      });
    });
    describe('Vault Log', () => {
      let vaultLog;
      const secret1 = { name: secretList[0], content: 'Secret-1-content' };
      const secret2 = { name: secretList[1], content: 'Secret-2-content' };
      let vaultId: VaultId;
      let commit1Oid: string;
      let commit2Oid: string;
      let commit3Oid: string;

      beforeEach(async () => {
        vaultLog = grpcUtils.promisifyReadableStreamCall<vaultsPB.LogEntry>(
          client,
          client.vaultsLog,
        );
        vaultId = await vaultManager.createVault(vaultList[0]);

        await vaultManager.withVaults([vaultId], async (vault) => {
          await vault.writeF(async (efs) => {
            await efs.writeFile(secret1.name, secret1.content);
          });
          commit1Oid = (await vault.log(undefined, 0))[0].commitId;

          await vault.writeF(async (efs) => {
            await efs.writeFile(secret2.name, secret2.content);
          });
          commit2Oid = (await vault.log(undefined, 0))[0].commitId;

          await vault.writeF(async (efs) => {
            await efs.unlink(secret2.name);
          });
          commit3Oid = (await vault.log(undefined, 0))[0].commitId;
        });
      });

      test('should get the full log', async () => {
        const vaultLog =
          grpcUtils.promisifyReadableStreamCall<vaultsPB.LogEntry>(
            client,
            client.vaultsLog,
          );
        const vaultsLogMessage = new vaultsPB.Log();
        const vaultMessage = new vaultsPB.Vault();
        vaultMessage.setNameOrId(vaultList[0]);
        vaultsLogMessage.setVault(vaultMessage);
        const logStream = vaultLog(vaultsLogMessage, callCredentials);
        const logMessages: vaultsPB.LogEntry[] = [];
        for await (const log of logStream) {
          logMessages.push(log);
        }
        // Checking commits exist in order.
        expect(logMessages[2].getOid()).toEqual(commit1Oid);
        expect(logMessages[1].getOid()).toEqual(commit2Oid);
        expect(logMessages[0].getOid()).toEqual(commit3Oid);
      });
      test('should get a part of the log', async () => {
        const vaultsLogMessage = new vaultsPB.Log();
        const vaultMessage = new vaultsPB.Vault();

        vaultMessage.setNameOrId(vaultList[0]);
        vaultsLogMessage.setVault(vaultMessage);
        vaultsLogMessage.setLogDepth(2);

        const logStream = await vaultLog(vaultsLogMessage, callCredentials);
        const logMessages: vaultsPB.LogEntry[] = [];
        for await (const log of logStream) {
          logMessages.push(log);
        }

        // Checking commits exist in order.
        expect(logMessages[1].getOid()).toEqual(commit2Oid);
        expect(logMessages[0].getOid()).toEqual(commit3Oid);
      });
      test('should get a specific commit', async () => {
        const vaultsLogMessage = new vaultsPB.Log();
        const vaultMessage = new vaultsPB.Vault();
        vaultMessage.setNameOrId(vaultList[0]);
        vaultsLogMessage.setVault(vaultMessage);
        vaultsLogMessage.setCommitId(commit2Oid);
        const logStream = await vaultLog(vaultsLogMessage, callCredentials);
        const logMessages: vaultsPB.LogEntry[] = [];
        for await (const log of logStream) {
          logMessages.push(log);
        }
        // Checking commits exist in order.
        expect(logMessages[0].getOid()).toEqual(commit2Oid);
      });
    });
    test('should get vault permissions', async () => {
      const vaultsPermissionsGet =
        grpcUtils.promisifyReadableStreamCall<permissionsPB.NodeActions>(
          client,
          client.vaultsPermissionsGet,
        );

      let remoteKeynode1: PolykeyAgent | undefined;
      let remoteKeynode2: PolykeyAgent | undefined;
      try {
        remoteKeynode1 = await PolykeyAgent.createPolykeyAgent({
          password,
          logger: logger.getChild('Remote Keynode 1'),
          nodePath: path.join(dataDir, 'remoteKeynode1'),
        });
        remoteKeynode2 = await PolykeyAgent.createPolykeyAgent({
          password,
          logger: logger.getChild('Remote Keynode 2'),
          nodePath: path.join(dataDir, 'remoteKeynode2'),
        });

        const targetNodeId1 = remoteKeynode1.keyManager.getNodeId();
        const targetNodeId2 = remoteKeynode2.keyManager.getNodeId();
        const pkAgentNodeId = pkAgent.keyManager.getNodeId();
        await pkAgent.gestaltGraph.setNode({
          id: nodesUtils.encodeNodeId(targetNodeId1),
          chain: {},
        });
        await pkAgent.gestaltGraph.setNode({
          id: nodesUtils.encodeNodeId(targetNodeId2),
          chain: {},
        });

        await pkAgent.nodeManager.setNode(targetNodeId1, {
          host: remoteKeynode1.revProxy.getIngressHost(),
          port: remoteKeynode1.revProxy.getIngressPort(),
        });
        await pkAgent.nodeManager.setNode(targetNodeId2, {
          host: remoteKeynode2.revProxy.getIngressHost(),
          port: remoteKeynode2.revProxy.getIngressPort(),
        });

        await remoteKeynode1.nodeManager.setNode(
          pkAgent.keyManager.getNodeId(),
          {
            host: pkAgent.revProxy.getIngressHost(),
            port: pkAgent.revProxy.getIngressPort(),
          },
        );
        await remoteKeynode2.nodeManager.setNode(targetNodeId2, {
          host: pkAgent.revProxy.getIngressHost(),
          port: pkAgent.revProxy.getIngressPort(),
        });
        await remoteKeynode1.acl.setNodePerm(pkAgentNodeId, {
          gestalt: {
            notify: null,
          },
          vaults: {},
        });
        await remoteKeynode2.acl.setNodePerm(pkAgentNodeId, {
          gestalt: {
            notify: null,
          },
          vaults: {},
        });

        const vaultId1 = await vaultManager.createVault(vaultList[0]);
        const vaultId2 = await vaultManager.createVault(vaultList[1]);

        await vaultManager.shareVault(vaultId1, targetNodeId1);
        await vaultManager.shareVault(vaultId1, targetNodeId2);
        await vaultManager.shareVault(vaultId2, targetNodeId1);

        const vaultMessage = new vaultsPB.Vault();
        vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultId1));

        const permissionsStream = vaultsPermissionsGet(
          vaultMessage,
          callCredentials,
        );
        const list: Record<string, unknown>[] = [];
        for await (const permission of permissionsStream) {
          expect(permission.getActionsList()).toEqual(['pull', 'clone']);
          list.push(permission.toObject());
        }
        expect(list).toHaveLength(2);

        vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultId2));
        const permissionStream2 = vaultsPermissionsGet(
          vaultMessage,
          callCredentials,
        );
        for await (const permission of permissionStream2) {
          expect(permission.getActionsList()).toEqual(['pull', 'clone']);
          const node = permission.getNode();
          const nodeId = node?.getNodeId();
          expect(nodeId).toEqual(targetNodeId1);
        }
      } finally {
        await remoteKeynode1?.stop();
        await remoteKeynode2?.stop();
      }
    });
  });
  describe('Secrets', () => {
    test('should make a directory in a vault', async () => {
      const mkdirVault = grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
        client,
        client.vaultsSecretsMkdir,
      );

      const vaultId = await vaultManager.createVault(vaultList[0]);
      const dirPath = 'dir/dir1/dir2';
      const vaultMkdirMessage = new vaultsPB.Mkdir();
      const vaultMessage = new vaultsPB.Vault();
      vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultId));
      vaultMkdirMessage.setVault(vaultMessage);
      vaultMkdirMessage.setDirName(dirPath);
      vaultMkdirMessage.setRecursive(true);
      await mkdirVault(vaultMkdirMessage, callCredentials);
      await vaultManager.withVaults([vaultId], async (vault) => {
        await vault.readF(async (efs) => {
          expect(await efs.exists(dirPath)).toBeTruthy();
        });
      });
    });
    test('should list secrets in a vault', async () => {
      const listSecretsVault =
        grpcUtils.promisifyReadableStreamCall<secretsPB.Secret>(
          client,
          client.vaultsSecretsList,
        );

      const vaultId = await vaultManager.createVault(vaultList[0]);
      await vaultManager.withVaults([vaultId], async (vault) => {
        await vault.writeF(async (efs) => {
          for (const secretName of secretList) {
            await efs.writeFile(secretName, secretName);
          }
        });
      });

      const vaultMessage = new vaultsPB.Vault();
      vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultId));
      const secretsStream = listSecretsVault(vaultMessage, callCredentials);
      const names: Array<string> = [];
      for await (const secret of secretsStream) {
        names.push(secret.getSecretName());
      }
      expect(names.sort()).toStrictEqual(secretList.sort());
    });
    test('should delete secrets in a vault', async () => {
      const deleteSecretVault =
        grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
          client,
          client.vaultsSecretsDelete,
        );

      const vaultId = await vaultManager.createVault(vaultList[0]);
      await vaultManager.withVaults([vaultId], async (vault) => {
        await vault.writeF(async (efs) => {
          for (const secretName of secretList) {
            await efs.writeFile(secretName, secretName);
          }
        });
      });

      const secretMessage = new secretsPB.Secret();
      const vaultMessage = new vaultsPB.Vault();
      vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultId));
      secretMessage.setVault(vaultMessage);
      secretMessage.setSecretName(secretList[0]);
      await deleteSecretVault(secretMessage, callCredentials);
      await vaultManager.withVaults([vaultId], async (vault) => {
        const secrets = await vault.readF(async (efs) => {
          return await efs.readdir('.', { encoding: 'utf8' });
        });
        expect(secrets.sort()).toEqual(secretList.slice(1).sort());
      });
    });
    test('should edit secrets in a vault', async () => {
      const editSecretVault =
        grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
          client,
          client.vaultsSecretsEdit,
        );
      const vaultId = await vaultManager.createVault(vaultList[0]);
      await vaultManager.withVaults([vaultId], async (vault) => {
        await vault.writeF(async (efs) => {
          await efs.writeFile(secretList[0], secretList[0]);
        });
      });
      const secretMessage = new secretsPB.Secret();
      const vaultMessage = new vaultsPB.Vault();
      vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultId));
      secretMessage.setVault(vaultMessage);
      secretMessage.setSecretName(secretList[0]);
      secretMessage.setSecretContent(Buffer.from('content-change'));
      await editSecretVault(secretMessage, callCredentials);

      await vaultManager.withVaults([vaultId], async (vault) => {
        await vault.readF(async (efs) => {
          expect((await efs.readFile(secretList[0])).toString()).toStrictEqual(
            'content-change',
          );
        });
      });
    });
    test('should get secrets in a vault', async () => {
      const getSecretVault = grpcUtils.promisifyUnaryCall<secretsPB.Secret>(
        client,
        client.vaultsSecretsGet,
      );
      const vaultId = await vaultManager.createVault(vaultList[0]);
      await vaultManager.withVaults([vaultId], async (vault) => {
        await vault.writeF(async (efs) => {
          await efs.writeFile(secretList[0], secretList[0]);
        });
      });
      const secretMessage = new secretsPB.Secret();
      const vaultMessage = new vaultsPB.Vault();
      vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultId));
      secretMessage.setVault(vaultMessage);
      secretMessage.setSecretName(secretList[0]);
      const secret = await getSecretVault(secretMessage, callCredentials);
      const secretContent = Buffer.from(secret.getSecretContent()).toString();
      expect(secretContent).toStrictEqual(secretList[0]);
    });
    test('should rename secrets in a vault', async () => {
      const renameSecretVault =
        grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
          client,
          client.vaultsSecretsRename,
        );
      const vaultId = await vaultManager.createVault(vaultList[0]);
      await vaultManager.withVaults([vaultId], async (vault) => {
        await vault.writeF(async (efs) => {
          await efs.writeFile(secretList[0], secretList[0]);
        });
      });
      const secretRenameMessage = new secretsPB.Rename();
      const vaultMessage = new vaultsPB.Vault();
      const secretMessage = new secretsPB.Secret();

      vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultId));
      secretMessage.setSecretName(secretList[0]);
      secretMessage.setVault(vaultMessage);
      secretRenameMessage.setNewName(secretList[1]);
      secretRenameMessage.setOldSecret(secretMessage);
      await renameSecretVault(secretRenameMessage, callCredentials);

      await vaultManager.withVaults([vaultId], async (vault) => {
        const secrets = await vault.readF(async (efs) => {
          return await efs.readdir('.');
        });
        expect(secrets.sort()).toEqual(secretList.splice(1, 1).sort());
      });
    });
    test('should add secrets in a vault', async () => {
      const newSecretVault =
        grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
          client,
          client.vaultsSecretsNew,
        );

      const vaultId = await vaultManager.createVault(vaultList[0]);
      const secretMessage = new secretsPB.Secret();
      const vaultMessage = new vaultsPB.Vault();

      vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultId));
      secretMessage.setVault(vaultMessage);
      secretMessage.setSecretName(secretList[0]);
      secretMessage.setSecretContent(Buffer.from(secretList[0]));
      await newSecretVault(secretMessage, callCredentials);
      await vaultManager.withVaults([vaultId], async (vault) => {
        const secret = await vault.readF(async (efs) => {
          return await efs.readFile(secretList[0], { encoding: 'utf8' });
        });
        expect(secret).toBe(secretList[0]);
      });
    });
    test('should add a directory of secrets in a vault', async () => {
      const newDirSecretVault =
        grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
          client,
          client.vaultsSecretsNewDir,
        );

      const secretDir = path.join(dataDir, 'secretDir');
      await fs.promises.mkdir(secretDir);
      for (const secret of secretList) {
        const secretFile = path.join(secretDir, secret);
        // Write secret to file
        await fs.promises.writeFile(secretFile, secret);
      }
      const vaultId = await vaultManager.createVault(vaultList[0]);
      const secretDirectoryMessage = new secretsPB.Directory();
      const vaultMessage = new vaultsPB.Vault();
      vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultId));
      secretDirectoryMessage.setVault(vaultMessage);
      secretDirectoryMessage.setSecretDirectory(secretDir);
      await newDirSecretVault(secretDirectoryMessage, callCredentials);
      await vaultManager.withVaults([vaultId], async (vault) => {
        const secrets = await vaultOps.listSecrets(vault);
        expect(secrets.sort()).toEqual(
          secretList.map((secret) => path.join('secretDir', secret)).sort(),
        );
      });
    });
    test('should stat a file', async () => {
      const getSecretStat = grpcUtils.promisifyUnaryCall<secretsPB.Stat>(
        client,
        client.vaultsSecretsStat,
      );
      const vaultId = await vaultManager.createVault(vaultList[0]);
      await vaultManager.withVaults([vaultId], async (vault) => {
        await vault.writeF(async (efs) => {
          await efs.writeFile(secretList[0], secretList[0]);
        });
      });
      const secretMessage = new secretsPB.Secret();
      const vaultMessage = new vaultsPB.Vault();
      vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultId));
      secretMessage.setVault(vaultMessage);
      secretMessage.setSecretName(secretList[0]);
      const result = await getSecretStat(secretMessage, callCredentials);
      const stat: Stat = JSON.parse(result.getJson());
      expect(stat.size).toBe(7);
      expect(stat.blksize).toBe(4096);
      expect(stat.blocks).toBe(1);
      expect(stat.nlink).toBe(1);
    });
  });
});
