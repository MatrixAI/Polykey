import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SuccessMessage,
  VaultsPullMessage,
} from '../types';
import type { VaultName } from '../../vaults/types';
import type { NodeId } from '../../ids';
import type VaultManager from '../../vaults/VaultManager';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';

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
  ): Promise<ClientRPCResponseResult<SuccessMessage>> => {
    const { db, vaultManager } = this.container;
    let pullVaultId;
    pullVaultId = vaultsUtils.decodeVaultId(input.pullVault);
    pullVaultId = pullVaultId ?? input.pullVault;
    await db.withTransactionF(async (tran) => {
      const vaultIdFromName = await vaultManager.getVaultId(
        input.nameOrId as VaultName,
        tran,
      );
      const vaultId =
        vaultIdFromName ?? vaultsUtils.decodeVaultId(input.nameOrId);
      if (vaultId == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined();
      }
      const {
        nodeId,
      }: {
        nodeId: NodeId | undefined;
      } = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['nodeId'], () => (value ? ids.parseNodeId(value) : undefined)],
            () => value,
          );
        },
        {
          nodeId: input.nodeIdEncoded,
        },
      );
      await vaultManager.pullVault({
        vaultId,
        pullNodeId: nodeId,
        pullVaultNameOrId: pullVaultId,
        tran,
      });
    });
    return {
      success: true,
    };
  };
}

export default VaultsPull;
