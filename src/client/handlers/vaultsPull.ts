import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { VaultName } from '../../vaults/types';
import type { NodeId } from '../../ids';
import type { SuccessMessage, VaultsPullMessage } from './types';
import type { DB } from '@matrixai/db';
import type VaultManager from '../../vaults/VaultManager';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as validationUtils from '../../validation/utils';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const vaultsPull = new UnaryCaller<
  RPCRequestParams<VaultsPullMessage>,
  RPCResponseResult<SuccessMessage>
>();

class VaultsPullHandler extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  RPCRequestParams<VaultsPullMessage>,
  RPCResponseResult<SuccessMessage>
> {
  public async handle(
    input: RPCRequestParams<VaultsPullMessage>,
  ): Promise<RPCResponseResult<SuccessMessage>> {
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
            [
              ['nodeId'],
              () => (value ? validationUtils.parseNodeId(value) : undefined),
            ],
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
  }
}

export { vaultsPull, VaultsPullHandler };
