import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { SecretIdentifierMessage, SuccessMessage } from './types';
import type VaultManager from '../../vaults/VaultManager';
import type { DB } from '@matrixai/db';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import { UnaryHandler } from '../../rpc/handlers';
import { UnaryCaller } from '../../rpc/callers';

const vaultsSecretsDelete = new UnaryCaller<
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<SuccessMessage>
>();

class VaultsSecretsDeleteHandler extends UnaryHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public async handle(
    input: ClientRPCRequestParams<SecretIdentifierMessage>,
  ): Promise<ClientRPCResponseResult<SuccessMessage>> {
    const { vaultManager, db } = this.container;
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
          await vaultOps.deleteSecret(vault, input.secretName);
        },
        tran,
      );
    });
    return {
      success: true,
    };
  }
}

export { vaultsSecretsDelete, VaultsSecretsDeleteHandler };
