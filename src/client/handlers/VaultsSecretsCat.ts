import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  ContentOrErrorMessage,
  SecretIdentifierMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import { DuplexHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';

// This method takes in multiple secret paths, and either returns the file
// contents, or an `ErrorMessage` signifying the error. To read a single secret
// instead, refer to `VaultsSecretsGet`.
class VaultsSecretsCat extends DuplexHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<ContentOrErrorMessage>
> {
  public handle = async function* (
    input: AsyncIterable<ClientRPCRequestParams<SecretIdentifierMessage>>,
  ): AsyncGenerator<ClientRPCResponseResult<ContentOrErrorMessage>> {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
    yield* db.withTransactionG(async function* (tran): AsyncGenerator<
      ClientRPCResponseResult<ContentOrErrorMessage>
    > {
      // As we need to preserve the order of parameters, we need to loop over
      // them individually, as grouping them would make them go out of order.
      for await (const secretIdentiferMessage of input) {
        const { nameOrId, secretName } = secretIdentiferMessage;
        const vaultIdFromName = await vaultManager.getVaultId(nameOrId, tran);
        const vaultId = vaultIdFromName ?? vaultsUtils.decodeVaultId(nameOrId);
        if (vaultId == null) throw new vaultsErrors.ErrorVaultsVaultUndefined();
        yield await vaultManager.withVaults(
          [vaultId],
          async (vault) => {
            try {
              const content = await vaultOps.getSecret(vault, secretName);
              return {
                type: 'success',
                success: true,
                secretContent: content.toString('binary'),
              };
            } catch (e) {
              if (
                e instanceof vaultsErrors.ErrorSecretsSecretUndefined ||
                e instanceof vaultsErrors.ErrorSecretsIsDirectory
              ) {
                return {
                  type: 'error',
                  code: e.cause.code,
                  reason: secretName,
                };
              }
              throw e;
            }
          },
          tran,
        );
      }
    });
  };
}

export default VaultsSecretsCat;
