import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { ResourceAcquire } from '@matrixai/resources';
import type { JSONValue } from '@matrixai/rpc';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SecretIdentifierMessageTagged,
  SuccessOrErrorMessageTagged,
  VaultNamesHeaderMessageTagged,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { FileSystemWritable } from '../../vaults/types';
import { withG } from '@matrixai/resources';
import { DuplexHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as clientErrors from '../errors';

class VaultsSecretsTouch extends DuplexHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<
    VaultNamesHeaderMessageTagged | SecretIdentifierMessageTagged
  >,
  ClientRPCResponseResult<SuccessOrErrorMessageTagged>
> {
  public handle = async function* (
    input: AsyncIterableIterator<
      ClientRPCRequestParams<
        VaultNamesHeaderMessageTagged | SecretIdentifierMessageTagged
      >
    >,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue>,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<SuccessOrErrorMessageTagged>> {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
    // Extract the header message from the iterator
    const headerMessagePair = await input.next();
    const headerMessage:
      | VaultNamesHeaderMessageTagged
      | SecretIdentifierMessageTagged = headerMessagePair.value;
    // Testing if the header is of the expected format
    if (
      headerMessagePair.done ||
      headerMessage.type !== 'VaultNamesHeaderMessage'
    ) {
      throw new clientErrors.ErrorClientInvalidHeader();
    }
    // Create an array of write acquires
    const vaultAcquires = await db.withTransactionF(async (tran) => {
      const vaultAcquires: Array<ResourceAcquire<FileSystemWritable>> = [];
      for (const vaultName of headerMessage.vaultNames) {
        ctx.signal.throwIfAborted();
        const vaultIdFromName = await vaultManager.getVaultId(vaultName, tran);
        const vaultId = vaultIdFromName ?? vaultsUtils.decodeVaultId(vaultName);
        if (vaultId == null) {
          throw new vaultsErrors.ErrorVaultsVaultUndefined(
            `Vault "${vaultName}" does not exist`,
          );
        }
        // The resource acquisition will automatically create a transaction and
        // release it when cleaning up.
        const acquire = await vaultManager.withVaults(
          [vaultId],
          async (vault) => vault.acquireWrite(undefined, ctx),
        );
        vaultAcquires.push(acquire);
      }
      return vaultAcquires;
    });
    // Acquire all locks in parallel and perform all operations at once
    yield* withG(
      vaultAcquires,
      async function* (efses): AsyncGenerator<SuccessOrErrorMessageTagged> {
        // Creating the vault name to efs map for easy access
        const vaultMap = new Map<string, FileSystemWritable>();
        for (let i = 0; i < efses.length; i++) {
          vaultMap.set(headerMessage!.vaultNames[i], efses[i]);
        }
        let loopRan = false;
        for await (const message of input) {
          ctx.signal.throwIfAborted();
          loopRan = true;
          // Header messages should not be seen anymore
          if (message.type === 'VaultNamesHeaderMessage') {
            throw new clientErrors.ErrorClientProtocolError(
              'The header message cannot be sent multiple times',
            );
          }
          const efs = vaultMap.get(message.nameOrId);
          if (efs == null) {
            throw new vaultsErrors.ErrorVaultsVaultUndefined(
              `Vault ${message.nameOrId} was not present in the header message`,
            );
          }
          try {
            // If the file exists, update its timestamps. Otherwise, create the
            // file. Note that this can throw errors, which are handled later.
            if (await efs.exists(message.secretName)) {
              const now = new Date();
              await efs.utimes(message.secretName, now, now);
            } else {
              await efs.writeFile(message.secretName);
            }
            yield {
              type: 'SuccessMessage',
              success: true,
            };
          } catch (e) {
            switch (e.code) {
              case 'ENOENT':
                yield {
                  type: 'ErrorMessage',
                  code: e.code,
                  reason: message.secretName,
                };
                break;
              default:
                throw e;
            }
          }
        }
        // Content messages must follow header messages
        if (!loopRan) {
          throw new clientErrors.ErrorClientProtocolError(
            'No content messages followed header message',
          );
        }
      },
    );
  };
}

export default VaultsSecretsTouch;
