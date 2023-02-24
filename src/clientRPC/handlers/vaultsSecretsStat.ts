import type { RPCRequestParams, RPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { SecretIdentifierMessage, SecretStatMessage } from './types';
import type { DB } from '@matrixai/db';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const vaultsSecretsStat = new UnaryCaller<
  RPCRequestParams<SecretIdentifierMessage>,
  RPCResponseResult<SecretStatMessage>
>();

class VaultsSecretsStatHandler extends UnaryHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  RPCRequestParams<SecretIdentifierMessage>,
  RPCResponseResult<SecretStatMessage>
> {
  public async handle(
    input: RPCRequestParams<SecretIdentifierMessage>,
  ): Promise<RPCResponseResult<SecretStatMessage>> {
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
      const secretName = input.secretName;
      const stat = await vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          return await vaultOps.statSecret(vault, secretName);
        },
        tran,
      );
      return {
        stat: JSON.stringify(stat),
      };
    });
  }
}

export { vaultsSecretsStat, VaultsSecretsStatHandler };
