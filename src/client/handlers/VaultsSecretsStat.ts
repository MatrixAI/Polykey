import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SecretIdentifierMessage,
  SecretStatMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import { UnaryHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultOps from '../../vaults/VaultOps';

class VaultsSecretsStat extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<SecretIdentifierMessage>,
  ClientRPCResponseResult<SecretStatMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<SecretIdentifierMessage>,
  ): Promise<ClientRPCResponseResult<SecretStatMessage>> => {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
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
  };
}

export default VaultsSecretsStat;
