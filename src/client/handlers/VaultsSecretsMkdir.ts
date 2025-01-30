import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SecretDirMessage,
  SuccessOrErrorMessageTagged,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { POJO } from '../../types';
import { DuplexHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';

class VaultsSecretsMkdir extends DuplexHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<SecretDirMessage>,
  ClientRPCResponseResult<SuccessOrErrorMessageTagged>
> {
  public handle = async function* (
    input: AsyncIterableIterator<ClientRPCRequestParams<SecretDirMessage>>,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<SuccessOrErrorMessageTagged>> {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
    let metadata: POJO;
    yield* db.withTransactionG(
      async function* (tran): AsyncGenerator<SuccessOrErrorMessageTagged> {
        for await (const secretDirMessage of input) {
          ctx.signal.throwIfAborted();
          // Unpack input
          if (metadata == null) metadata = secretDirMessage.metadata ?? {};
          const nameOrId = secretDirMessage.nameOrId;
          const dirName = secretDirMessage.dirName;
          // Get vaultId
          const vaultIdFromName = await vaultManager.getVaultId(nameOrId, tran);
          const vaultId =
            vaultIdFromName ?? vaultsUtils.decodeVaultId(nameOrId);
          if (vaultId == null) {
            throw new vaultsErrors.ErrorVaultsVaultUndefined(
              `Vault "${nameOrId}" does not exist`,
            );
          }

          // Write directories. This doesn't need to be grouped by vault names,
          // as no commit is created for empty directories anyway.
          yield await vaultManager.withVaults(
            [vaultId],
            async (vault) => {
              try {
                await vaultOps.mkdir(vault, dirName, {
                  recursive: metadata?.options?.recursive,
                });
                return { type: 'SuccessMessage', success: true };
              } catch (e) {
                if (
                  e instanceof vaultsErrors.ErrorVaultsRecursive ||
                  e instanceof vaultsErrors.ErrorSecretsSecretDefined
                ) {
                  return {
                    type: 'ErrorMessage',
                    code: e.cause.code,
                    reason: dirName,
                  };
                } else {
                  throw e;
                }
              }
            },
            tran,
            ctx,
          );
        }
      },
    );
  };
}

export default VaultsSecretsMkdir;
