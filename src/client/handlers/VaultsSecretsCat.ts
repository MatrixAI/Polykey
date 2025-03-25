import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  ContentOrErrorMessage,
  SecretIdentifierMessage,
} from '../types.js';
import type VaultManager from '../../vaults/VaultManager.js';
import { DuplexHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils.js';
import * as vaultsErrors from '../../vaults/errors.js';
import * as vaultOps from '../../vaults/VaultOps.js';

class VaultsSecretsCat extends DuplexHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<ContentOrErrorMessage>
> {
  public handle = async function* (
    input: AsyncIterableIterator<
      ClientRPCRequestParams<SecretIdentifierMessage>
    >,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<ContentOrErrorMessage>> {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
    yield* db.withTransactionG(async function* (tran): AsyncGenerator<
      ClientRPCResponseResult<ContentOrErrorMessage>
    > {
      // To preserve the order of parameters, we need to loop over them
      // individually, as grouping them would make them go out of order.
      for await (const secretIdentifierMessage of input) {
        ctx.signal.throwIfAborted();
        const { nameOrId, secretName } = secretIdentifierMessage;
        const vaultIdFromName = await vaultManager.getVaultId(nameOrId, tran);
        const vaultId = vaultIdFromName ?? vaultsUtils.decodeVaultId(nameOrId);
        if (vaultId == null) {
          throw new vaultsErrors.ErrorVaultsVaultUndefined(
            `Vault "${nameOrId}" does not exist`,
          );
        }
        yield await vaultManager.withVaults(
          [vaultId],
          async (vault) => {
            try {
              const content = await vaultOps.getSecret(vault, secretName);
              return {
                type: 'SuccessMessage',
                success: true,
                secretContent: content.toString('binary'),
              };
            } catch (e) {
              if (
                e instanceof vaultsErrors.ErrorSecretsSecretUndefined ||
                e instanceof vaultsErrors.ErrorSecretsIsDirectory
              ) {
                return {
                  type: 'ErrorMessage',
                  code: e.cause.code,
                  reason: secretName,
                };
              }
              throw e;
            }
          },
          tran,
          ctx,
        );
      }
    });
  };
}

export default VaultsSecretsCat;
