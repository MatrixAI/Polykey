import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { SecretNameMessage, VaultIdentifierMessage } from './types';
import type { DB } from '@matrixai/db';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import { ServerHandler } from '../../rpc/handlers';
import { ServerCaller } from '../../rpc/callers';

const vaultsSecretsList = new ServerCaller<
  ClientRPCRequestParams<VaultIdentifierMessage>,
  ClientRPCResponseResult<SecretNameMessage>
>();

class VaultsSecretsListHandler extends ServerHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  ClientRPCRequestParams<VaultIdentifierMessage>,
  ClientRPCResponseResult<SecretNameMessage>
> {
  public async *handle(
    input: ClientRPCRequestParams<VaultIdentifierMessage>,
  ): AsyncGenerator<ClientRPCResponseResult<SecretNameMessage>> {
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
