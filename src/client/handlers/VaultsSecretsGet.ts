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

// This method only returns the contents of a single secret, and throws an error
// if the secret couldn't be read. To read multiple secrets, refer to
// `VaultsSecretsCat`.
class VaultsSecretsGet extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<ContentMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<SecretIdentifierMessage>,
  ): Promise<ClientRPCResponseResult<ContentMessage>> => {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
    return db.withTransactionF(async (tran) => {
      const vaultIdFromName = await vaultManager.getVaultId(
        input.nameOrId,
        tran,
      );
      const vaultId =
        vaultIdFromName ?? vaultsUtils.decodeVaultId(input.nameOrId);
      if (vaultId == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined(
          `Vault "${input.nameOrId}" does not exist`,
        );
      }
      // Get the contents of the file
      return await vaultManager.withVaults([vaultId], async (vault) => {
        const content = await vaultOps.getSecret(vault, input.secretName);
        return { secretContent: content.toString('binary') };
      });
    });
  };
}

export default VaultsSecretsGet;
