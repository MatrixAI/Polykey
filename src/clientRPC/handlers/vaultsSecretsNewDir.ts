import type { RPCRequestParams, RPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { SecretDirMessage, SuccessMessage } from './types';
import type { DB } from '@matrixai/db';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const vaultsSecretsNewDir = new UnaryCaller<
  RPCRequestParams<SecretDirMessage>,
  RPCResponseResult<SuccessMessage>
>();

class VaultsSecretsNewDirHandler extends UnaryHandler<
  {
    vaultManager: VaultManager;
    db: DB;
    fs: FileSystem;
  },
  RPCRequestParams<SecretDirMessage>,
  RPCResponseResult<SuccessMessage>
> {
  public async handle(
    input: RPCRequestParams<SecretDirMessage>,
  ): Promise<RPCResponseResult<SuccessMessage>> {
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
