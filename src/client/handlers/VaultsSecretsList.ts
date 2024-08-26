import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SecretFilesMessage,
  SecretIdentifierMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import path from 'path';
import { ServerHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';

class VaultsSecretsList extends ServerHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<SecretFilesMessage>
> {
  public async *handle(
    input: ClientRPCRequestParams<SecretIdentifierMessage>,
    _cancel: any,
  ): AsyncGenerator<ClientRPCResponseResult<SecretFilesMessage>, void, void> {
    const { vaultManager, db } = this.container;
    const vaultId = await db.withTransactionF(async (tran) => {
      const vaultIdFromName = await vaultManager.getVaultId(
        input.nameOrId,
        tran,
      );
      const vaultId =
        vaultIdFromName ?? vaultsUtils.decodeVaultId(input.nameOrId);
      if (vaultId == null) throw new vaultsErrors.ErrorVaultsVaultUndefined();
      return vaultId;
    });

    yield* vaultManager.withVaultsG([vaultId], (vault) => {
      return vault.readG(async function* (fs): AsyncGenerator<
        SecretFilesMessage,
        void,
        void
      > {
        let files: Array<string | Buffer>;
        try {
          files = await fs.promises.readdir(input.secretName);
        } catch (e) {
          if (e.code === 'ENOENT') {
            throw new vaultsErrors.ErrorSecretsDirectoryUndefined(e.message, {
              cause: e,
            });
          }
          if (e.code === 'ENOTDIR') {
            throw new vaultsErrors.ErrorSecretsIsSecret(e.message, {
              cause: e,
            });
          }
          throw e;
        }
        for await (const file of files) {
          const filePath = path.join(input.secretName, file.toString());
          const stat = await fs.promises.stat(filePath);
          const type = stat.isFile() ? 'FILE' : 'DIRECTORY';
          yield { path: filePath, type: type };
        }
      });
    });
  }
}

export default VaultsSecretsList;
