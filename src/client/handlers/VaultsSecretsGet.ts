import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  ContentMessage,
  SecretIdentifierMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import { UnaryHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';

class VaultsSecretsGet extends UnaryHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<ContentMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<SecretIdentifierMessage>,
  ): Promise<ClientRPCResponseResult<ContentMessage>> => {
    const { vaultManager, db } = this.container;
    return await db.withTransactionF(async (tran) => {
      const vaultIdFromName = await vaultManager.getVaultId(
        input.nameOrId,
        tran,
      );
      const vaultId =
        vaultIdFromName ?? vaultsUtils.decodeVaultId(input.nameOrId);
      if (vaultId == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined();
      }
      const secretContent = await vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          return await vaultOps.getSecret(vault, input.secretName);
        },
        tran,
      );
      return {
        secretContent: secretContent.toString('binary'),
      };
    });
  };
}

export default VaultsSecretsGet;
