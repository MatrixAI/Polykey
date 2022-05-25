import type * as grpc from '@grpc/grpc-js';
import type VaultManager from '@/vaults/VaultManager';
import type { VaultName } from '@/vaults/types';
import type { ClientServiceClient } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import type { Stat } from 'encryptedfs';
import type * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import type { ClientMetadata } from '@/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import KeyManager from '@/keys/KeyManager';
import Proxy from '@/network/Proxy';
import * as vaultsPB from '@/proto/js/polykey/v1/vaults/vaults_pb';
import * as secretsPB from '@/proto/js/polykey/v1/secrets/secrets_pb';
import * as grpcUtils from '@/grpc/utils';
import * as vaultsUtils from '@/vaults/utils';
import * as vaultOps from '@/vaults/VaultOps';
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

    const proxy = new Proxy({
      authToken: 'abc',
      logger: logger,
    });

    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: dataDir,
      logger,
      proxy,
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
  describe('Secrets', () => {
    test('should make a directory in a vault', async () => {
      const mkdirVault = grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
        client,
        {} as ClientMetadata,
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
          {} as ClientMetadata,
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
          {} as ClientMetadata,
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
          {} as ClientMetadata,
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
        {} as ClientMetadata,
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
          {} as ClientMetadata,
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
          {} as ClientMetadata,
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
          {} as ClientMetadata,
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
        {} as ClientMetadata,
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
