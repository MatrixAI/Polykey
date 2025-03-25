import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  VaultIdMessage,
  VaultNameMessage,
} from '../types.js';
import type VaultManager from '../../vaults/VaultManager.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils.js';

class VaultsCreate extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<VaultNameMessage>,
  ClientRPCResponseResult<VaultIdMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<VaultNameMessage>,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): Promise<ClientRPCResponseResult<VaultIdMessage>> => {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
    const vaultId = await db.withTransactionF((tran) =>
      vaultManager.createVault(input.vaultName, tran, ctx),
    );
    return { vaultIdEncoded: vaultsUtils.encodeVaultId(vaultId) };
  };
}

export default VaultsCreate;
