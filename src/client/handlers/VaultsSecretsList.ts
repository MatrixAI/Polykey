import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SecretFilesMessage,
  SecretIdentifierMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import path from 'path';
import { ServerHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';

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
    _meta: Record<string, JSONValue>,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<SecretFilesMessage>> {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
    const vaultId = await db.withTransactionF(async (tran) => {
      const vaultIdFromName = await vaultManager.getVaultId(
        input.nameOrId,
        tran,
      );
      const vaultId =
        vaultIdFromName ?? vaultsUtils.decodeVaultId(input.nameOrId);
      if (vaultId == null) throw new vaultsErrors.ErrorVaultsVaultUndefined();
      return vaultId;
    });

    yield* vaultManager.withVaultsG([vaultId], (vault) => {
      return vault.readG(
        async function* (fs): AsyncGenerator<SecretFilesMessage> {
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
          for await (const file of files) {
            ctx.signal.throwIfAborted();
            const filePath = path.join(input.secretName, file.toString());
            const stat = await fs.promises.stat(filePath);
            const type = stat.isFile() ? 'FILE' : 'DIRECTORY';
            yield { path: filePath, type: type };
          }
        },
      );
    });
  };
}

export default VaultsSecretsList;
