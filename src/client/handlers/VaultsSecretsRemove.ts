import type { DB } from '@matrixai/db';
import type { ResourceAcquire } from '@matrixai/resources';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SecretsRemoveHeaderMessage,
  SecretIdentifierMessageTagged,
  SuccessOrErrorMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { FileSystemWritable } from '../../vaults/types';
import { withG } from '@matrixai/resources';
import { DuplexHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as clientErrors from '../errors';

class VaultsSecretsRemove extends DuplexHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<
    SecretsRemoveHeaderMessage | SecretIdentifierMessageTagged
  >,
  ClientRPCResponseResult<SuccessOrErrorMessage>
> {
  public handle = async function* (
    input: AsyncIterable<
      ClientRPCRequestParams<
        SecretsRemoveHeaderMessage | SecretIdentifierMessageTagged
      >
    >,
  ): AsyncGenerator<ClientRPCResponseResult<SuccessOrErrorMessage>> {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
    const vaultAcquires: Array<ResourceAcquire<FileSystemWritable>> = [];
    // Extracts the header message from the iterator
    const headerMessage = await (async () => {
      const iterator = input[Symbol.asyncIterator]();
      const header = (await iterator.next()).value;
      if (header.type === 'VaultNamesHeaderMessage') {
        if (header == null) throw new clientErrors.ErrorClientInvalidHeader();
        return header;
      }
    })();
    // Create an array of write acquires
    await db.withTransactionF(async (tran) => {
      for (const vaultName of headerMessage.vaultNames) {
        const vaultIdFromName = await vaultManager.getVaultId(vaultName, tran);
        const vaultId = vaultIdFromName ?? vaultsUtils.decodeVaultId(vaultName);
        if (vaultId == null) {
          throw new vaultsErrors.ErrorVaultsVaultUndefined(
            `Vault ${vaultName} does not exist`,
          );
        }
        const acquire = await vaultManager.withVaults(
          [vaultId],
          async (vault) => vault.acquireWrite(),
        );
        vaultAcquires.push(acquire);
      }
    });
    // Acquire all locks in parallel and perform all operations at once
    yield* withG(
      vaultAcquires,
      async function* (efses): AsyncGenerator<SuccessOrErrorMessage> {
        // Creating the vault name to efs map for easy access
        const vaultMap = new Map<string, FileSystemWritable>();
        for (let i = 0; i < efses.length; i++) {
          vaultMap.set(headerMessage!.vaultNames[i], efses[i]);
        }
        for await (const message of input) {
          // Ignoring any header messages
          if (message.type !== 'SecretIdentifierMessage') continue;
          const efs = vaultMap.get(message.nameOrId);
          if (efs == null) {
            throw new vaultsErrors.ErrorVaultsVaultUndefined(
              `Vault ${message.nameOrId} was not present in the header message`,
            );
          }
          try {
            const stat = await efs.stat(message.secretName);
            if (stat.isDirectory()) {
              await efs.rmdir(message.secretName, {
                recursive: headerMessage.recursive,
              });
            } else {
              await efs.unlink(message.secretName);
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
                reason: message.secretName,
              };
            } else {
              throw e;
            }
          }
        }
      },
    );
  };
}

export default VaultsSecretsRemove;
