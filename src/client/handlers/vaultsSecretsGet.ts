import type { DB } from '@matrixai/db';
import type { ContentMessage, SecretIdentifierMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import { UnaryHandler } from '../../rpc/handlers';

class VaultsSecretsGetHandler extends UnaryHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<ContentMessage>
> {
  public handle = async(
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
  }
}

export { VaultsSecretsGetHandler };
