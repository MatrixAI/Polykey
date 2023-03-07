import type { RPCRequestParams, RPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { VaultsLatestVersionMessage, VaultsVersionMessage } from './types';
import type { DB } from '@matrixai/db';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const vaultsVersion = new UnaryCaller<
  RPCRequestParams<VaultsVersionMessage>,
  RPCResponseResult<VaultsLatestVersionMessage>
>();

class VaultsVersionHandler extends UnaryHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  RPCRequestParams<VaultsVersionMessage>,
  RPCResponseResult<VaultsLatestVersionMessage>
> {
  public async handle(
    input: RPCRequestParams<VaultsVersionMessage>,
  ): Promise<RPCResponseResult<VaultsLatestVersionMessage>> {
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

export { vaultsVersion, VaultsVersionHandler };
