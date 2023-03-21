import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { SecretDirMessage, SuccessMessage } from './types';
import type { DB } from '@matrixai/db';
import type { FileSystem } from 'types';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import { UnaryCaller } from '../../rpc/callers';
import { UnaryHandler } from '../../rpc/handlers';

const vaultsSecretsNewDir = new UnaryCaller<
  ClientRPCRequestParams<SecretDirMessage>,
  ClientRPCResponseResult<SuccessMessage>
>();

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

export { vaultsSecretsNewDir, VaultsSecretsNewDirHandler };
