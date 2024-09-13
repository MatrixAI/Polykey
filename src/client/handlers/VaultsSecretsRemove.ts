import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SuccessMessage,
  SecretIdentifierMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import { ClientHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';

class VaultsSecretsRemove extends ClientHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public handle = async (
    input: AsyncIterable<ClientRPCRequestParams<SecretIdentifierMessage>>,
  ): Promise<ClientRPCResponseResult<SuccessMessage>> => {
    const { vaultManager, db } = this.container;
    // Create a record of secrets to be removed, grouped by vault names
    const vaultGroups: Record<string, Array<string>> = {};
    const secretNames: Array<[string, string]> = [];
    let metadata: any = undefined;
    for await (const secretRemoveMessage of input) {
      if (metadata == null) metadata = secretRemoveMessage.metadata ?? {};
      secretNames.push([
        secretRemoveMessage.nameOrId,
        secretRemoveMessage.secretName,
      ]);
    }
    secretNames.forEach(([vaultName, secretName]) => {
      if (vaultGroups[vaultName] == null) {
        vaultGroups[vaultName] = [];
      }
      vaultGroups[vaultName].push(secretName);
    });

    await db.withTransactionF(async (tran) => {
      for (const [vaultName, secretNames] of Object.entries(vaultGroups)) {
        const vaultIdFromName = await vaultManager.getVaultId(vaultName, tran);
        const vaultId = vaultIdFromName ?? vaultsUtils.decodeVaultId(vaultName);
        if (vaultId == null) throw new vaultsErrors.ErrorVaultsVaultUndefined();
        await vaultManager.withVaults(
          [vaultId],
          async (vault) => {
            await vaultOps.deleteSecret(vault, secretNames, {
              recursive: metadata?.options?.recursive,
            });
          },
          tran,
        );
      }
    });

    return { success: true };
  };
}

export default VaultsSecretsRemove;
