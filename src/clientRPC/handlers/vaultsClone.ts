import type { RPCRequestParams, RPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { CloneMessage, SuccessMessage } from './types';
import type { DB } from '@matrixai/db';
import type { NodeId } from '../../ids';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as validationUtils from '../../validation/utils';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const vaultsClone = new UnaryCaller<
  RPCRequestParams<CloneMessage>,
  RPCResponseResult<SuccessMessage>
>();

class VaultsCloneHandler extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  RPCRequestParams<CloneMessage>,
  RPCResponseResult<SuccessMessage>
> {
  public async handle(
    input: RPCRequestParams<CloneMessage>,
  ): Promise<RPCResponseResult<SuccessMessage>> {
    const { db, vaultManager } = this.container;
    const {
      nodeId,
    }: {
      nodeId: NodeId;
    } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['nodeId'], () => validationUtils.parseNodeId(value)],
          () => value,
        );
      },
      {
        nodeId: input.nodeIdEncoded,
      },
    );
    // Vault id
    await db.withTransactionF(async (tran) => {
      await vaultManager.cloneVault(nodeId, input.nameOrId, tran);
    });
    return {
      success: true,
    };
  }
}

export { vaultsClone, VaultsCloneHandler };
