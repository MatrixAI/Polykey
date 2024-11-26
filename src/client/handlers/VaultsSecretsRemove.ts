import type { DB } from '@matrixai/db';
import { ResourceAcquire, withG } from '@matrixai/resources';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SecretsRemoveHeaderMessage,
  SecretIdentifierMessageTagged,
  SuccessOrErrorMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import { DuplexHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as clientErrors from '../errors';
import { FileSystemWritable } from '../../vaults/types';
import * as utils from '../../utils';

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
      let header: SecretsRemoveHeaderMessage | undefined;
      for await (const value of input) {
        // TS cannot properly narrow down this type as it is too deeply wrapped.
        // The as keyword is used to help it with type narrowing.
        const message = value as
          | SecretIdentifierMessageTagged
          | SecretsRemoveHeaderMessage;
        if (message.type === 'VaultNamesHeaderMesage') header = message;
        break;
      }
      // The header message is mandatory
      if (header == null) throw new clientErrors.ErrorClientInvalidHeader();
      return header;
    })();
    // Create an array of write acquires
    await db.withTransactionF(async (tran) => {
      for (const vaultName of headerMessage!.vaultNames) {
        const vaultIdFromName = await vaultManager.getVaultId(vaultName, tran);
        const vaultId = vaultIdFromName ?? vaultsUtils.decodeVaultId(vaultName);
        if (vaultId == null) {
          throw new vaultsErrors.ErrorVaultsVaultUndefined(
            `Vault ${vaultName} does not exist`,
          );
        }
        await vaultManager.withVaults([vaultId], async (vault) => {
          vaultAcquires.push(vault.acquireWrite());
        });
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
        for await (const value of input) {
          // TS cannot properly narrow down this type as it is too deeply wrapped.
          // The as keyword is used to help it with type narrowing.
          const message = value as
            | SecretIdentifierMessageTagged
            | SecretsRemoveHeaderMessage;
          // Ignoring any header messages
          if (message.type === 'SecretIdentifierMessage') {
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
        }
      },
    );

    // Create a record of secrets to be removed, grouped by vault names
    // const vaultGroups: Record<string, Array<string>> = {};
    // const secretNames: Array<[string, string]> = [];
    // let metadata: any = undefined;
    // for await (const secretRemoveMessage of input) {
    //   if (metadata == null) metadata = secretRemoveMessage.metadata ?? {};
    //   secretNames.push([
    //     secretRemoveMessage.nameOrId,
    //     secretRemoveMessage.secretName,
    //   ]);
    // }
    // secretNames.forEach(([vaultName, secretName]) => {
    //   if (vaultGroups[vaultName] == null) {
    //     vaultGroups[vaultName] = [];
    //   }
    //   vaultGroups[vaultName].push(secretName);
    // });
    // Now, all the paths will be removed for a vault within a single commit
    // yield* db.withTransactionG(
    //   async function* (tran): AsyncGenerator<SuccessOrErrorMessage> {
    //     for (const [vaultName, secretNames] of Object.entries(vaultGroups)) {
    //       const vaultIdFromName = await vaultManager.getVaultId(
    //         vaultName,
    //         tran,
    //       );
    //       const vaultId =
    //         vaultIdFromName ?? vaultsUtils.decodeVaultId(vaultName);
    //       if (vaultId == null) {
    //         throw new vaultsErrors.ErrorVaultsVaultUndefined();
    //       }
    //       yield* vaultManager.withVaultsG(
    //         [vaultId],
    //         async function* (vault): AsyncGenerator<SuccessOrErrorMessage> {
    //           yield* vault.writeG(
    //             async function* (efs): AsyncGenerator<SuccessOrErrorMessage> {
    //               for (const secretName of secretNames) {
    //                 try {
    //                   const stat = await efs.stat(secretName);
    //                   if (stat.isDirectory()) {
    //                     await efs.rmdir(secretName, {
    //                       recursive: metadata?.options?.recursive,
    //                     });
    //                   } else {
    //                     await efs.unlink(secretName);
    //                   }
    //                   yield {
    //                     type: 'success',
    //                     success: true,
    //                   };
    //                 } catch (e) {
    //                   if (
    //                     e.code === 'ENOENT' ||
    //                     e.code === 'ENOTEMPTY' ||
    //                     e.code === 'EINVAL'
    //                   ) {
    //                     // INVAL can be triggered if removing the root of the
    //                     // vault is attempted.
    //                     yield {
    //                       type: 'error',
    //                       code: e.code,
    //                       reason: secretName,
    //                     };
    //                   } else {
    //                     throw e;
    //                   }
    //                 }
    //               }
    //             },
    //           );
    //         },
    //         tran,
    //       );
    //     }
    //   },
    // );
  };
}

export default VaultsSecretsRemove;
