import type { FileSystem } from 'types';
import type { DB } from '@matrixai/db';
import type { SecretDirMessage, SuccessMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import { UnaryHandler } from '@matrixai/rpc/dist/handlers';

class VaultsSecretsNewDirHandler extends UnaryHandler<
  {
    vaultManager: VaultManager;
    db: DB;
    fs: FileSystem;
  },
  ClientRPCRequestParams<SecretDirMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public async handle(
    input: ClientRPCRequestParams<SecretDirMessage>,
  ): Promise<ClientRPCResponseResult<SuccessMessage>> {
    const { vaultManager, db, fs } = this.container;
    await db.withTransactionF(async (tran) => {
      const vaultIdFromName = await vaultManager.getVaultId(
        input.nameOrId,
        tran,
      );
      const vaultId =
        vaultIdFromName ?? vaultsUtils.decodeVaultId(input.nameOrId);
      if (vaultId == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined();
      }
      await vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          await vaultOps.addSecretDirectory(vault, input.dirName, fs);
        },
        tran,
      );
    });
    return {
      success: true,
    };
  }
}

export { VaultsSecretsNewDirHandler };
