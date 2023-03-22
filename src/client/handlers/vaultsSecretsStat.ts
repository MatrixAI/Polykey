import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { SecretIdentifierMessage, SecretStatMessage } from './types';
import type { DB } from '@matrixai/db';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';
import { UnaryHandler } from '../../rpc/handlers';

class VaultsSecretsStatHandler extends UnaryHandler<
  {
    vaultManager: VaultManager;
    db: DB;
  },
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<SecretStatMessage>
> {
  public async handle(
    input: ClientRPCRequestParams<SecretIdentifierMessage>,
  ): Promise<ClientRPCResponseResult<SecretStatMessage>> {
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
        stat: {
          dev: stat.dev,
          ino: stat.ino,
          mode: stat.mode,
          nlink: stat.nlink,
          uid: stat.uid,
          gid: stat.gid,
          rdev: stat.rdev,
          size: stat.size,
          atime: stat.atime.toString(),
          mtime: stat.mtime.toString(),
          ctime: stat.ctime.toString(),
          birthtime: stat.birthtime.toString(),
          blksize: stat.blksize,
          blocks: stat.blocks,
        },
      };
    });
  }
}

export { VaultsSecretsStatHandler };
