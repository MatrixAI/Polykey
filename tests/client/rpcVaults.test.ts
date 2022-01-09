import type * as grpc from '@grpc/grpc-js';
import type { VaultManager } from '@/vaults';
import type { Vault, VaultName } from '@/vaults/types';
import type { ClientServiceClient } from '@/proto/js/polykey/v1/client_service_grpc_pb';
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
import * as testUtils from './utils';

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

    [server, port] = await testUtils.openTestClientServer({
      pkAgent,
      secure: false,
    });

    client = await testUtils.openSimpleClientClient(port);
  }, global.polykeyStartupTimeout);
  afterAll(async () => {
    await testUtils.closeTestClientServer(server);
    testUtils.closeSimpleClientClient(client);

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
    callCredentials = testUtils.createCallCredentials(sessionToken);
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
      expect(vaultNames.get(vaultList[0])).toStrictEqual(
        vaultsUtils.makeVaultId(vaultId.getNameOrId()),
      );
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
      const vault = await vaultManager.createVault(vaultList[0]);

      const vaultRenameMessage = new vaultsPB.Rename();
      const vaultMessage = new vaultsPB.Vault();
      vaultMessage.setNameOrId(vaultsUtils.makeVaultIdPretty(vault.vaultId));
      vaultRenameMessage.setVault(vaultMessage);
      vaultRenameMessage.setNewName(vaultList[1]);

      const vaultId = await renameVault(vaultRenameMessage, callCredentials);
      expect(vaultsUtils.makeVaultId(vaultId.getNameOrId())).toStrictEqual(
        vault.vaultId,
      );

      const renamedVaultId = await vaultManager.getVaultId(vaultList[1]);
      expect(renamedVaultId).toEqual(vault.vaultId);
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
      let vault: Vault;
      let vaultsVersion;

      beforeEach(async () => {
        vault = await vaultManager.createVault(vaultList[0]);
        vaultsVersion = grpcUtils.promisifyUnaryCall<vaultsPB.VersionResult>(
          client,
          client.vaultsVersion,
        );
      });

      test('should switch a vault to a version', async () => {
        // Commit some history
        await vault.commit(async (efs) => {
          await efs.writeFile(secretVer1.name, secretVer1.content);
        });
        const ver1Oid = (await vault.log())[0].oid;
        await vault.commit(async (efs) => {
          await efs.writeFile(secretVer2.name, secretVer2.content);
        });
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
        await vault.access(async (efs) => {
          expect(
            (await efs.readFile(secretVer1.name)).toString(),
          ).toStrictEqual(secretVer1.content);
        });
      });
      test('should fail to find a non existent version', async () => {
        // Revert the version
        const vaultMessage = new vaultsPB.Vault();
        vaultMessage.setNameOrId(vaultsUtils.makeVaultIdPretty(vault.vaultId));
        const vaultVersionMessage = new vaultsPB.Version();
        vaultVersionMessage.setVault(vaultMessage);
        vaultVersionMessage.setVersionId('invalidOid');
        const version = vaultsVersion(vaultVersionMessage, callCredentials);
        await expect(version).rejects.toThrow(
          vaultErrors.ErrorVaultCommitUndefined,
        );
      });
    });
    describe('Vault Log', () => {
      let vaultLog;
      const secret1 = { name: secretList[0], content: 'Secret-1-content' };
      const secret2 = { name: secretList[1], content: 'Secret-2-content' };
      let vault: Vault;
      let commit1Oid: string;
      let commit2Oid: string;
      let commit3Oid: string;

      beforeEach(async () => {
        vaultLog = grpcUtils.promisifyReadableStreamCall<vaultsPB.LogEntry>(
          client,
          client.vaultsLog,
        );
        vault = await vaultManager.createVault(vaultList[0]);

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
  });
  describe('Secrets', () => {
    test('should make a directory in a vault', async () => {
      const mkdirVault = grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
        client,
        client.vaultsSecretsMkdir,
      );

      const vault = await vaultManager.createVault(vaultList[0]);
      const dirPath = 'dir/dir1/dir2';
      const vaultMkdirMessage = new vaultsPB.Mkdir();
      const vaultMessage = new vaultsPB.Vault();
      vaultMessage.setNameOrId(vaultsUtils.makeVaultIdPretty(vault.vaultId));
      vaultMkdirMessage.setVault(vaultMessage);
      vaultMkdirMessage.setDirName(dirPath);
      vaultMkdirMessage.setRecursive(true);
      await mkdirVault(vaultMkdirMessage, callCredentials);
      await vault.access(async (efs) => {
        expect(await efs.exists(dirPath)).toBeTruthy();
      });
    });
    test('should list secrets in a vault', async () => {
      const listSecretsVault =
        grpcUtils.promisifyReadableStreamCall<secretsPB.Secret>(
          client,
          client.vaultsSecretsList,
        );

      const vault = await vaultManager.createVault(vaultList[0]);
      await vault.commit(async (efs) => {
        for (const secretName of secretList) {
          await efs.writeFile(secretName, secretName);
        }
      });
      const vaultMessage = new vaultsPB.Vault();
      vaultMessage.setNameOrId(vaultsUtils.makeVaultIdPretty(vault.vaultId));
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

      const vault = await vaultManager.createVault(vaultList[0]);
      await vault.commit(async (efs) => {
        for (const secretName of secretList) {
          await efs.writeFile(secretName, secretName);
        }
      });
      const secretMessage = new secretsPB.Secret();
      const vaultMessage = new vaultsPB.Vault();
      vaultMessage.setNameOrId(vaultsUtils.makeVaultIdPretty(vault.vaultId));
      secretMessage.setVault(vaultMessage);
      secretMessage.setSecretName(secretList[0]);
      await deleteSecretVault(secretMessage, callCredentials);
      const secrets = await vault.access(async (efs) => {
        return await efs.readdir('.', { encoding: 'utf8' });
      });
      expect(secrets.sort()).toEqual(secretList.slice(1).sort());
    });
    test('should edit secrets in a vault', async () => {
      const editSecretVault =
        grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
          client,
          client.vaultsSecretsEdit,
        );
      const vault = await vaultManager.createVault(vaultList[0]);
      await vault.commit(async (efs) => {
        await efs.writeFile(secretList[0], secretList[0]);
      });
      const secretMessage = new secretsPB.Secret();
      const vaultMessage = new vaultsPB.Vault();
      vaultMessage.setNameOrId(vaultsUtils.makeVaultIdPretty(vault.vaultId));
      secretMessage.setVault(vaultMessage);
      secretMessage.setSecretName(secretList[0]);
      secretMessage.setSecretContent(Buffer.from('content-change'));
      await editSecretVault(secretMessage, callCredentials);
      await vault.access(async (efs) => {
        expect((await efs.readFile(secretList[0])).toString()).toStrictEqual(
          'content-change',
        );
      });
    });
    test('should get secrets in a vault', async () => {
      const getSecretVault = grpcUtils.promisifyUnaryCall<secretsPB.Secret>(
        client,
        client.vaultsSecretsGet,
      );
      const vault = await vaultManager.createVault(vaultList[0]);
      await vault.commit(async (efs) => {
        await efs.writeFile(secretList[0], secretList[0]);
      });
      const secretMessage = new secretsPB.Secret();
      const vaultMessage = new vaultsPB.Vault();
      vaultMessage.setNameOrId(vaultsUtils.makeVaultIdPretty(vault.vaultId));
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
      const vault = await vaultManager.createVault(vaultList[0]);
      await vault.commit(async (efs) => {
        await efs.writeFile(secretList[0], secretList[0]);
      });
      const secretRenameMessage = new secretsPB.Rename();
      const vaultMessage = new vaultsPB.Vault();
      const secretMessage = new secretsPB.Secret();

      vaultMessage.setNameOrId(vaultsUtils.makeVaultIdPretty(vault.vaultId));
      secretMessage.setSecretName(secretList[0]);
      secretMessage.setVault(vaultMessage);
      secretRenameMessage.setNewName(secretList[1]);
      secretRenameMessage.setOldSecret(secretMessage);
      await renameSecretVault(secretRenameMessage, callCredentials);
      const secrets = await vault.access(async (efs) => {
        return await efs.readdir('.');
      });
      expect(secrets.sort()).toEqual(secretList.splice(1, 1).sort());
    });
    test('should add secrets in a vault', async () => {
      const newSecretVault =
        grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
          client,
          client.vaultsSecretsNew,
        );

      const vault = await vaultManager.createVault(vaultList[0]);
      const secretMessage = new secretsPB.Secret();
      const vaultMessage = new vaultsPB.Vault();
      vaultMessage.setNameOrId(vaultsUtils.makeVaultIdPretty(vault.vaultId));
      secretMessage.setVault(vaultMessage);
      secretMessage.setSecretName(secretList[0]);
      secretMessage.setSecretContent(Buffer.from(secretList[0]));
      await newSecretVault(secretMessage, callCredentials);
      const secret = await vault.access(async (efs) => {
        return await efs.readFile(secretList[0], { encoding: 'utf8' });
      });
      expect(secret).toBe(secretList[0]);
    });
    test.only('should add a directory of secrets in a vault', async () => {
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
      const vault = await vaultManager.createVault(vaultList[0]);
      const secretDirectoryMessage = new secretsPB.Directory();
      const vaultMessage = new vaultsPB.Vault();
      vaultMessage.setNameOrId(vaultsUtils.makeVaultIdPretty(vault.vaultId));
      secretDirectoryMessage.setVault(vaultMessage);
      secretDirectoryMessage.setSecretDirectory(secretDir);
      await newDirSecretVault(secretDirectoryMessage, callCredentials);
      const secrets = await vaultOps.listSecrets(vault);
      expect(secrets.sort()).toEqual(
        secretList.map((secret) => path.join('secretDir', secret)).sort(),
      );
    });
    // TODO: Permissions not supported yet.
    // test.skip('should add permissions to a vault', async () => {
    //   fail('Functionality not fully implemented');
    //   const vaultName = 'vault1' as VaultName;
    //   const vaultsSetPerms =
    //     grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
    //       client,
    //       client.vaultsPermissionsSet,
    //     );

    //   // Creating a vault
    //   await vaultManager.createVault(vaultName);

    //   // Creating a gestalts state
    //   await createGestaltState();

    //   const setVaultPermMessage = new vaultsPB.PermSet();
    //   const nodeMessage = new nodesPB.Node();
    //   const vaultMessage = new vaultsPB.Vault();
    //   nodeMessage.setNodeId(node2.id);
    //   vaultMessage.setNameOrId(vaultName);
    //   setVaultPermMessage.setVault(vaultMessage);
    //   setVaultPermMessage.setNode(nodeMessage);
    //   await vaultsSetPerms(setVaultPermMessage, callCredentials);

    //   // FIXME: this is not implemented yet.
    //   const result = 'Not implemented'; //Await vaultManager.getVaultPermissions(vaultId);
    //   const stringResult = JSON.stringify(result);
    //   expect(stringResult).toContain(node2.id);
    //   expect(stringResult).toContain('pull');
    // });
    // test.skip('should remove permissions to a vault', async () => {
    //   const vaultName = 'vault1' as VaultName;
    //   const vaultsUnsetPerms =
    //     grpcUtils.promisifyUnaryCall<utilsPB.StatusMessage>(
    //       client,
    //       client.vaultsPermissionsUnset,
    //     );

    //   // Creating a vault.
    //   const vault = await vaultManager.createVault(vaultName);
    //   const vaults = await vaultManager.listVaults();
    //   const vaultId = vault.vaultId;

    //   // Creating a gestalts state
    //   await createGestaltState();
    //   fail('Functionality not fully implemented');
    //   // FIXME: not implemented yet
    //   // await vaultManager.setVaultPermissions(node2.id, vaultId);

    //   const unsetVaultPermMessage = new vaultsPB.PermUnset();
    //   const nodeMessage = new nodesPB.Node();
    //   const vaultMessage = new vaultsPB.Vault();
    //   nodeMessage.setNodeId(node2.id);
    //   vaultMessage.setNameOrId(vaults[0].name);
    //   unsetVaultPermMessage.setVault(vaultMessage);
    //   unsetVaultPermMessage.setNode(nodeMessage);
    //   await vaultsUnsetPerms(unsetVaultPermMessage, callCredentials);

    //   // FIXME: not implemented yet
    //   // const result = await vaultManager.getVaultPermissions(vaultId);
    //   // const stringResult = JSON.stringify(result);
    //   // expect(stringResult).toContain(node2.id);
    //   // expect(stringResult.includes('pull')).toBeFalsy();
    // });
  });
});
