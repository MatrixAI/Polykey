import type { RPCRequestParams, RPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { SecretNameMessage, VaultIdentifierMessage } from './types';
import type { DB } from '@matrixai/db';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import { ServerHandler } from '../../RPC/handlers';
import { ServerCaller } from '../../RPC/callers';

const vaultsSecretsList = new ServerCaller<
  RPCRequestParams<VaultIdentifierMessage>,
  RPCResponseResult<SecretNameMessage>
>();

class VaultsSecretsListHandler extends ServerHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  RPCRequestParams<VaultIdentifierMessage>,
  RPCResponseResult<SecretNameMessage>
> {
  public async *handle(
    input: RPCRequestParams<VaultIdentifierMessage>,
  ): AsyncGenerator<RPCResponseResult<SecretNameMessage>> {
    const { vaultManager, db } = this.container;
    const secrets = await db.withTransactionF(async (tran) => {
      const vaultIdFromName = await vaultManager.getVaultId(
        input.nameOrId,
        tran,
      );
      const vaultId =
        vaultIdFromName ?? vaultsUtils.decodeVaultId(input.nameOrId);
      if (vaultId == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined();
      }
      return await vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          return await vaultOps.listSecrets(vault);
        },
        tran,
      );
    });
    for (const secret of secrets) {
      yield {
        secretName: secret,
      };
    }
  }
}

export { vaultsSecretsList, VaultsSecretsListHandler };
