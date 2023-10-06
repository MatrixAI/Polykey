import type { DB } from '@matrixai/db';
import type { SecretNameMessage, VaultIdentifierMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import { ServerHandler } from '@matrixai/rpc/dist/handlers';

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
    _cancel,
    _meta,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<SecretNameMessage>> {
    if (ctx.signal.aborted) throw ctx.signal.reason;
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
      if (ctx.signal.aborted) throw ctx.signal.reason;
      yield {
        secretName: secret,
      };
    }
  }
}

export { VaultsSecretsListHandler };
