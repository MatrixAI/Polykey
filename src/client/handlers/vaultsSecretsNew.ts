import type { DB } from '@matrixai/db';
import type { SecretContentMessage, SuccessMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import { UnaryHandler } from '@matrixai/rpc/dist/handlers';

class VaultsSecretsNewHandler extends UnaryHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  ClientRPCRequestParams<SecretContentMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public async handle(
    input: ClientRPCRequestParams<SecretContentMessage>,
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
      const content = Buffer.from(input.secretContent, 'binary');
      await vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          await vaultOps.addSecret(vault, input.secretName, content);
        },
        tran,
      );
    });
    return {
      success: true,
    };
  }
}

export { VaultsSecretsNewHandler };
