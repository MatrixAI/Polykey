import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SuccessMessage,
  VaultsPullMessage,
} from '../types';
import type { NodeId } from '../../ids';
import type VaultManager from '../../vaults/VaultManager';
import { UnaryHandler } from '@matrixai/rpc';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as ids from '../../ids';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';

class VaultsPull extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<VaultsPullMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<VaultsPullMessage>,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): Promise<ClientRPCResponseResult<SuccessMessage>> => {
    const { db, vaultManager }: { db: DB; vaultManager: VaultManager } =
      this.container;
    const pullVaultId =
      vaultsUtils.decodeVaultId(input.pullVault) ?? input.pullVault;
    await db.withTransactionF(async (tran) => {
      const vaultIdFromName = await vaultManager.getVaultId(
        input.nameOrId!,
        tran,
      );
      const vaultId =
        vaultIdFromName ?? vaultsUtils.decodeVaultId(input.nameOrId);
      if (vaultId == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined(
          `Vault "${input.nameOrId}" does not exist`,
        );
      }
      const { nodeId }: { nodeId: NodeId } = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [
              ['nodeId'],
              () => (value != null ? ids.parseNodeId(value) : undefined),
            ],
            () => value,
          );
        },
        {
          nodeId: input.nodeIdEncoded,
        },
      );
      await vaultManager.pullVault(
        {
          vaultId: vaultId,
          pullNodeId: nodeId,
          pullVaultNameOrId: pullVaultId,
        },
        tran,
        ctx,
      );
    });
    return { success: true };
  };
}

export default VaultsPull;
