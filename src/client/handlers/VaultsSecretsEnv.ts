import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SecretIdentifierMessage,
  SecretContentOrErrorMessage,
} from '../types.js';
import type VaultManager from '../../vaults/VaultManager.js';
import { DuplexHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils.js';

class VaultsSecretsEnv extends DuplexHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<SecretContentOrErrorMessage>
> {
  public handle = async function* (
    input: AsyncIterableIterator<
      ClientRPCRequestParams<SecretIdentifierMessage>
    >,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): AsyncGenerator<
    ClientRPCResponseResult<SecretContentOrErrorMessage>,
    void,
    void
  > {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
    return yield* db.withTransactionG(async function* (tran): AsyncGenerator<
      ClientRPCResponseResult<SecretContentOrErrorMessage>,
      void,
      void
    > {
      for await (const secretIdentifierMessage of input) {
        const { nameOrId, secretName } = secretIdentifierMessage;
        const vaultIdFromName = await vaultManager.getVaultId(nameOrId, tran);
        const vaultId = vaultIdFromName ?? vaultsUtils.decodeVaultId(nameOrId);
        if (vaultId == null) {
          yield {
            type: 'ErrorMessage',
            code: 'EINVAL',
            reason: `Vault "${nameOrId}" does not exist`,
            data: { secretName: undefined, nameOrId },
          };
          continue;
        }
        yield* vaultManager.withVaultsG(
          [vaultId],
          async function* (
            vault,
          ): AsyncGenerator<SecretContentOrErrorMessage, void, void> {
            yield* vault.readG(async function* (efs): AsyncGenerator<
              SecretContentOrErrorMessage,
              void,
              void
            > {
              try {
                for await (const filePath of vaultsUtils.walkFs(
                  efs,
                  secretName,
                )) {
                  ctx.signal.throwIfAborted();
                  const fileContents = await efs.readFile(filePath);
                  yield {
                    type: 'SuccessMessage',
                    success: true,
                    nameOrId: nameOrId,
                    secretName: filePath,
                    secretContent: fileContents.toString(),
                  };
                }
              } catch (e) {
                if (e.code === 'ENOENT') {
                  yield {
                    type: 'ErrorMessage',
                    code: e.code,
                    reason: `Secret "${secretName}" does not exist`,
                    data: { secretName, nameOrId },
                  };
                } else {
                  throw e;
                }
              }
            });
          },
          tran,
          ctx,
        );
      }
    });
  };
}

export default VaultsSecretsEnv;
