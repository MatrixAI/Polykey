import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  ContentWithErrorMessage,
  SecretIdentifierMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import { DuplexHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';

class VaultsSecretsGet extends DuplexHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<ContentWithErrorMessage>
> {
  public handle = async function* (
    input: AsyncIterable<ClientRPCRequestParams<SecretIdentifierMessage>>,
    _cancel,
    _meta,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<ContentWithErrorMessage>> {
    if (ctx.signal.aborted) throw ctx.signal.reason;
    const { vaultManager, db } = this.container;
    yield* db.withTransactionG(async function* (tran): AsyncGenerator<
      ClientRPCResponseResult<ContentWithErrorMessage>
    > {
      if (ctx.signal.aborted) throw ctx.signal.reason;
      // As we need to preserve the order of parameters, we need to loop over
      // them individually, as grouping them would make them go out of order.
      let metadata: any = undefined;
      for await (const secretIdentiferMessage of input) {
        if (ctx.signal.aborted) throw ctx.signal.reason;
        if (metadata == null) metadata = secretIdentiferMessage.metadata ?? {};
        const { nameOrId, secretName } = secretIdentiferMessage;
        const vaultIdFromName = await vaultManager.getVaultId(nameOrId, tran);
        const vaultId = vaultIdFromName ?? vaultsUtils.decodeVaultId(nameOrId);
        if (vaultId == null) throw new vaultsErrors.ErrorVaultsVaultUndefined();
        yield await vaultManager.withVaults(
          [vaultId],
          async (vault) => {
            try {
              const content = await vaultOps.getSecret(vault, secretName);
              return { secretContent: content.toString('binary') };
            } catch (e) {
              if (metadata?.options?.continueOnError === true) {
                if (e instanceof vaultsErrors.ErrorSecretsSecretUndefined) {
                  return {
                    secretContent: '',
                    error: `${e.name}: ${secretName}: No such secret or directory\n`,
                  };
                } else if (e instanceof vaultsErrors.ErrorSecretsIsDirectory) {
                  return {
                    secretContent: '',
                    error: `${e.name}: ${secretName}: Is a directory\n`,
                  };
                }
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

export default VaultsSecretsGet;
