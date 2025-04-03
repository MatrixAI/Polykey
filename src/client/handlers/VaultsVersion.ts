import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  VaultsLatestVersionMessage,
  VaultsVersionMessage,
} from '../types.js';
import type VaultManager from '../../vaults/VaultManager.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils.js';
import * as vaultsErrors from '../../vaults/errors.js';

class VaultsVersion extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<VaultsVersionMessage>,
  ClientRPCResponseResult<VaultsLatestVersionMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<VaultsVersionMessage>,
  ): Promise<ClientRPCResponseResult<VaultsLatestVersionMessage>> => {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
    return await db.withTransactionF(async (tran) => {
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
      const versionId = input.versionId;
      const [latestOid, currentVersionId] = await vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          // Use default values for the ref and limit. We only care about
          // passing in the relevant context.
          const latestOid = (await vault.log())[0].commitId;
          await vault.version(versionId);
          const currentVersionId = (await vault.log(versionId))[0]?.commitId;
          return [latestOid, currentVersionId];
        },
        tran,
      );
      // Checking if latest version ID
      return { latestVersion: latestOid === currentVersionId };
    });
  };
}

export default VaultsVersion;
