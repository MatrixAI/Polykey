import type { RPCRequestParams, RPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { DB } from '@matrixai/db';
import type { SecretMkdirMessage, SuccessMessage } from './types';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import { UnaryHandler } from '../../RPC/handlers';
import { UnaryCaller } from '../../RPC/callers';

const vaultsSecretsMkdir = new UnaryCaller<
  RPCRequestParams<SecretMkdirMessage>,
  RPCResponseResult<SuccessMessage>
>();

class VaultsSecretsMkdirHandler extends UnaryHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  RPCRequestParams<SecretMkdirMessage>,
  RPCResponseResult<SuccessMessage>
> {
  public async handle(
    input: RPCRequestParams<SecretMkdirMessage>,
  ): Promise<RPCResponseResult<SuccessMessage>> {
    const { vaultManager, db } = this.container;
    await db.withTransactionF(async (tran) => {
      const vaultIdFromName = await vaultManager.getVaultId(
        input.nameOrId,
        tran,
      );
      const vaultId =
        vaultIdFromName ?? vaultsUtils.decodeVaultId(input.nameOrId);
      if (vaultId == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined();
      }
      await vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          await vaultOps.mkdir(vault, input.dirName, {
            recursive: input.recursive,
          });
        },
        tran,
      );
    });
    return {
      success: true,
    };
  }
}

export { vaultsSecretsMkdir, VaultsSecretsMkdirHandler };
