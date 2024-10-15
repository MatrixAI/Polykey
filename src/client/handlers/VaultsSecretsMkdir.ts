import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SecretDirMessage,
  SuccessOrErrorMessage,
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
  ClientRPCResponseResult<SuccessOrErrorMessage>
> {
  public handle = async function* (
    input: AsyncIterable<ClientRPCRequestParams<SecretDirMessage>>,
  ): AsyncGenerator<ClientRPCResponseResult<SuccessOrErrorMessage>> {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
    let metadata: POJO;
    yield* db.withTransactionG(
      async function* (tran): AsyncGenerator<SuccessOrErrorMessage> {
        for await (const secretDirMessage of input) {
          // Unpack input
          if (metadata == null) metadata = secretDirMessage.metadata ?? {};
          const nameOrId = secretDirMessage.nameOrId;
          const dirName = secretDirMessage.dirName;
          // Get vaultId
          const vaultIdFromName = await vaultManager.getVaultId(nameOrId, tran);
          const vaultId =
            vaultIdFromName ?? vaultsUtils.decodeVaultId(nameOrId);
          if (vaultId == null) {
            throw new vaultsErrors.ErrorVaultsVaultUndefined();
          }
          // Write directories. This doesn't need to be grouped by vault names,
          // as no commit is created for empty directories anyways. The
          // vaultOps.mkdir() method also returns an object of type
          // SuccessOrErrorMessage. As such, we can return the result without
          // doing any type conversion or extra processing.
          yield await vaultManager.withVaults(
            [vaultId],
            async (vault) => {
              return await vaultOps.mkdir(vault, dirName, {
                recursive: metadata?.options?.recursive,
              });
            },
            tran,
          );
        }
      },
    );
  };
}

export default VaultsSecretsMkdir;
