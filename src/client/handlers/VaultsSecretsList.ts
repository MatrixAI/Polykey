import type { ContextTimed } from '@matrixai/contexts';
import type { JSONValue } from '@matrixai/rpc';
import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SecretFilesMessage,
  SecretIdentifierMessage,
} from '../types.js';
import type VaultManager from '../../vaults/VaultManager.js';
import path from 'node:path';
import { ServerHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils.js';
import * as vaultsErrors from '../../vaults/errors.js';

class VaultsSecretsList extends ServerHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<SecretFilesMessage>
> {
  public handle = async function* (
    input: ClientRPCRequestParams<SecretIdentifierMessage>,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<SecretFilesMessage>, void, void> {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
    const vaultId = await db.withTransactionF(async (tran) => {
      const vaultIdFromName = await vaultManager.getVaultId(
        input.nameOrId,
        tran,
      );
      const vaultId =
        vaultIdFromName ?? vaultsUtils.decodeVaultId(input.nameOrId);
      if (vaultId == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined(
          `Vault "${input.nameOrId}" does not exist`,
        );
      }
      return vaultId;
    });

    yield* vaultManager.withVaultsG([vaultId], (vault) => {
      return vault.readG(async function* (fs): AsyncGenerator<
        SecretFilesMessage,
        void,
        void
      > {
        let files: Array<string | Buffer>;
        try {
          files = await fs.promises.readdir(input.secretName);
        } catch (e) {
          if (e.code === 'ENOENT') {
            throw new vaultsErrors.ErrorSecretsDirectoryUndefined(e.message, {
              cause: e,
            });
          }
          if (e.code === 'ENOTDIR') {
            throw new vaultsErrors.ErrorSecretsIsSecret(e.message, {
              cause: e,
            });
          }
          throw e;
        }
        for (const file of files) {
          ctx.signal.throwIfAborted();
          const filePath = path.join(input.secretName, file.toString());
          const stat = await fs.promises.stat(filePath);
          const type = stat.isFile() ? 'FILE' : 'DIRECTORY';
          yield { path: filePath, type: type };
        }
      });
    });
  };
}

export default VaultsSecretsList;
