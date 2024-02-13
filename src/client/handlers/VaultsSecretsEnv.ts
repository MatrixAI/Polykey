import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SecretIdentifierMessage,
  SecretContentMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import { DuplexHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';

class VaultsSecretsList extends DuplexHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<SecretContentMessage>
> {
  public handle = async function* (
    input: AsyncIterableIterator<
      ClientRPCRequestParams<SecretIdentifierMessage>
    >,
    _cancel,
    _meta,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<SecretContentMessage>> {
    if (ctx.signal.aborted) throw ctx.signal.reason;
    const { vaultManager, db }: { vaultManager: VaultManager; db: DB } =
      this.container;

    return yield* db.withTransactionG(async function* (tran): AsyncGenerator<
      ClientRPCResponseResult<SecretContentMessage>
    > {
      if (ctx.signal.aborted) throw ctx.signal.reason;
      for await (const secretIdentifierMessage of input) {
        const { nameOrId, secretName } = secretIdentifierMessage;
        const vaultIdFromName = await vaultManager.getVaultId(nameOrId, tran);
        const vaultId = vaultIdFromName ?? vaultsUtils.decodeVaultId(nameOrId);
        if (vaultId == null) {
          throw new vaultsErrors.ErrorVaultsVaultUndefined();
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
                  const fileContents = await fs.readFile(filePath);
                  results.push({
                    filePath,
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
        );
        for (const { filePath, value } of secrets) {
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

export default VaultsSecretsList;
