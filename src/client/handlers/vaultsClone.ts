import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { CloneMessage, SuccessMessage } from './types';
import type { DB } from '@matrixai/db';
import type { NodeId } from '../../ids';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as validationUtils from '../../validation/utils';
import { UnaryCaller } from '../../rpc/callers';
import { UnaryHandler } from '../../rpc/handlers';

const vaultsClone = new UnaryCaller<
  ClientRPCRequestParams<CloneMessage>,
  ClientRPCResponseResult<SuccessMessage>
>();

class VaultsCloneHandler extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
  },
  ClientRPCRequestParams<CloneMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public async handle(
    input: ClientRPCRequestParams<CloneMessage>,
  ): Promise<ClientRPCResponseResult<SuccessMessage>> {
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
