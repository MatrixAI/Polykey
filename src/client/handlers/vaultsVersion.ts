import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { VaultsLatestVersionMessage, VaultsVersionMessage } from './types';
import type { DB } from '@matrixai/db';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import { UnaryHandler } from '../../rpc/handlers';

class VaultsVersionHandler extends UnaryHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  ClientRPCRequestParams<VaultsVersionMessage>,
  ClientRPCResponseResult<VaultsLatestVersionMessage>
> {
  public async handle(
    input: ClientRPCRequestParams<VaultsVersionMessage>,
  ): Promise<ClientRPCResponseResult<VaultsLatestVersionMessage>> {
    const { vaultManager, db } = this.container;
    return await db.withTransactionF(async (tran) => {
      const vaultIdFromName = await vaultManager.getVaultId(
        input.nameOrId,
        tran,
      );
      const vaultId =
        vaultIdFromName ?? vaultsUtils.decodeVaultId(input.nameOrId);
      if (vaultId == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined();
      }
      const versionId = input.versionId;
      const [latestOid, currentVersionId] = await vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          const latestOid = (await vault.log())[0].commitId;
          await vault.version(versionId);
          const currentVersionId = (await vault.log(versionId, 0))[0]?.commitId;
          return [latestOid, currentVersionId];
        },
        tran,
      );
      // Checking if latest version ID
      const latestVersion = latestOid === currentVersionId;
      return {
        latestVersion,
      };
    });
  }
}

export { VaultsVersionHandler };
