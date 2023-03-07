import type { RPCRequestParams, RPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { DB } from '@matrixai/db';
import type { ContentMessage, SecretIdentifierMessage } from './types';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import { UnaryHandler } from '../../RPC/handlers';
import { UnaryCaller } from '../../RPC/callers';

const vaultsSecretsGet = new UnaryCaller<
  RPCRequestParams<SecretIdentifierMessage>,
  RPCResponseResult<ContentMessage>
>();

class VaultsSecretsGetHandler extends UnaryHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  RPCRequestParams<SecretIdentifierMessage>,
  RPCResponseResult<ContentMessage>
> {
  public async handle(
    input: RPCRequestParams<SecretIdentifierMessage>,
  ): Promise<RPCResponseResult<ContentMessage>> {
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
      const secretContent = await vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          return await vaultOps.getSecret(vault, input.secretName);
        },
        tran,
      );
      return {
        secretContent: secretContent.toString('binary'),
      };
    });
  }
}

export { vaultsSecretsGet, VaultsSecretsGetHandler };
