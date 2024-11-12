import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SecretIdentifierMessage,
  SuccessOrErrorMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import { DuplexHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';

class VaultsSecretsRemove extends DuplexHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<SuccessOrErrorMessage>
> {
  public handle = async function* (
    input: AsyncIterable<ClientRPCRequestParams<SecretIdentifierMessage>>,
  ): AsyncGenerator<ClientRPCResponseResult<SuccessOrErrorMessage>> {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
    // Create a record of secrets to be removed, grouped by vault names
    const vaultGroups: Record<string, Array<string>> = {};
    const secretNames: Array<[string, string]> = [];
    let metadata: any = undefined;
    for await (const secretRemoveMessage of input) {
      if (metadata == null) metadata = secretRemoveMessage.metadata ?? {};
      secretNames.push([
        secretRemoveMessage.nameOrId,
        secretRemoveMessage.secretName,
      ]);
    }
    secretNames.forEach(([vaultName, secretName]) => {
      if (vaultGroups[vaultName] == null) {
        vaultGroups[vaultName] = [];
      }
      vaultGroups[vaultName].push(secretName);
    });
    // Now, all the paths will be removed for a vault within a single commit
    yield* db.withTransactionG(
      async function* (tran): AsyncGenerator<SuccessOrErrorMessage> {
        for (const [vaultName, secretNames] of Object.entries(vaultGroups)) {
          const vaultIdFromName = await vaultManager.getVaultId(
            vaultName,
            tran,
          );
          const vaultId =
            vaultIdFromName ?? vaultsUtils.decodeVaultId(vaultName);
          if (vaultId == null) {
            throw new vaultsErrors.ErrorVaultsVaultUndefined();
          }
          yield* vaultManager.withVaultsG(
            [vaultId],
            async function* (vault): AsyncGenerator<SuccessOrErrorMessage> {
              yield* vault.writeG(
                async function* (efs): AsyncGenerator<SuccessOrErrorMessage> {
                  for (const secretName of secretNames) {
                    try {
                      const stat = await efs.stat(secretName);
                      if (stat.isDirectory()) {
                        await efs.rmdir(secretName, {
                          recursive: metadata?.options?.recursive,
                        });
                      } else {
                        await efs.unlink(secretName);
                      }
                      yield {
                        type: 'success',
                        success: true,
                      };
                    } catch (e) {
                      if (
                        e.code === 'ENOENT' ||
                        e.code === 'ENOTEMPTY' ||
                        e.code === 'EINVAL'
                      ) {
                        // INVAL can be triggered if removing the root of the
                        // vault is attempted.
                        yield {
                          type: 'error',
                          code: e.code,
                          reason: secretName,
                        };
                      } else {
                        throw e;
                      }
                    }
                  }
                },
              );
            },
            tran,
          );
        }
      },
    );
  };
}

export default VaultsSecretsRemove;
