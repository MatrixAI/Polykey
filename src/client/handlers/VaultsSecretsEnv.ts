import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SecretIdentifierMessage,
  SecretContentMessage,
} from '../types.js';
import type VaultManager from '../../vaults/VaultManager.js';
import { DuplexHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils.js';
import * as vaultsErrors from '../../vaults/errors.js';

class VaultsSecretsEnv extends DuplexHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<SecretContentMessage>
> {
  public handle = async function* (
    input: AsyncIterableIterator<
      ClientRPCRequestParams<SecretIdentifierMessage>
    >,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<SecretContentMessage>> {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
    return yield* db.withTransactionG(async function* (tran): AsyncGenerator<
      ClientRPCResponseResult<SecretContentMessage>
    > {
      for await (const secretIdentifierMessage of input) {
        const { nameOrId, secretName } = secretIdentifierMessage;
        const vaultIdFromName = await vaultManager.getVaultId(nameOrId, tran);
        const vaultId = vaultIdFromName ?? vaultsUtils.decodeVaultId(nameOrId);
        if (vaultId == null) {
          throw new vaultsErrors.ErrorVaultsVaultUndefined(
            `Vault "${nameOrId}" does not exist`,
          );
        }
        const secrets = await vaultManager.withVaults(
          [vaultId],
          async (vault) => {
            const results: Array<{
              filePath: string;
              value: string;
            }> = [];
            return await vault.readF(async (fs) => {
              try {
                for await (const filePath of vaultsUtils.walkFs(
                  fs,
                  secretName,
                )) {
                  ctx.signal.throwIfAborted();
                  const fileContents = await fs.readFile(filePath);
                  results.push({
                    filePath: filePath,
                    value: fileContents.toString(),
                  });
                }
              } catch (e) {
                if (e.code === 'ENOENT') {
                  throw new vaultsErrors.ErrorSecretsSecretUndefined(
                    `Secret with name: ${secretName} does not exist`,
                    { cause: e },
                  );
                }
                throw e;
              }
              return results;
            });
          },
          tran,
          ctx,
        );
        for (const { filePath, value } of secrets) {
          ctx.signal.throwIfAborted();
          yield {
            nameOrId: nameOrId,
            secretName: filePath,
            secretContent: value,
          };
        }
      }
    });
  };
}

export default VaultsSecretsEnv;
