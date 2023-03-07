import type { RPCRequestParams, RPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { DB } from '@matrixai/db';
import type { SecretContentMessage, SuccessMessage } from './types';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import { UnaryHandler } from '../../RPC/handlers';
import { UnaryCaller } from '../../RPC/callers';

const vaultsSecretsEdit = new UnaryCaller<
  RPCRequestParams<SecretContentMessage>,
  RPCResponseResult<SuccessMessage>
>();

class VaultsSecretsEditHandler extends UnaryHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  RPCRequestParams<SecretContentMessage>,
  RPCResponseResult<SuccessMessage>
> {
  public async handle(
    input: RPCRequestParams<SecretContentMessage>,
  ): Promise<RPCResponseResult<SuccessMessage>> {
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
      const secretContent = Buffer.from(input.secretContent, 'binary');
      await vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          await vaultOps.updateSecret(vault, input.secretName, secretContent);
        },
        tran,
      );
    });
    return {
      success: true,
    };
  }
}

export { vaultsSecretsEdit, VaultsSecretsEditHandler };
