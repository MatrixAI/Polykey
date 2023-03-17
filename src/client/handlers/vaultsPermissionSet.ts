import type { RPCRequestParams, RPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type ACL from '../../acl/ACL';
import type { PermissionSetMessage, SuccessMessage } from './types';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type { DB } from '@matrixai/db';
import type { VaultAction, VaultActions } from '../../vaults/types';
import type { NodeId } from '../../ids';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as validationUtils from '../../validation/utils';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const vaultsPermissionSet = new UnaryCaller<
  RPCRequestParams<PermissionSetMessage>,
  RPCResponseResult<SuccessMessage>
>();

class VaultsPermissionSetHandler extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
    gestaltGraph: GestaltGraph;
    acl: ACL;
    notificationsManager: NotificationsManager;
  },
  RPCRequestParams<PermissionSetMessage>,
  RPCResponseResult<SuccessMessage>
> {
  public async handle(
    input: RPCRequestParams<PermissionSetMessage>,
  ): Promise<RPCResponseResult<SuccessMessage>> {
    const { db, vaultManager, gestaltGraph, acl, notificationsManager } =
      this.container;
    await db.withTransactionF(async (tran) => {
      const vaultIdFromName = await vaultManager.getVaultId(
        input.nameOrId,
        tran,
      );
      const vaultId =
        vaultIdFromName ?? vaultsUtils.decodeVaultId(input.nameOrId);
      if (vaultId == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined();
      }
      const {
        nodeId,
        actions,
      }: {
        nodeId: NodeId;
        actions: Array<VaultAction>;
      } = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['nodeId'], () => validationUtils.parseNodeId(value)],
            [['actions'], () => value.map(validationUtils.parseVaultAction)],
            () => value,
          );
        },
        {
          nodeId: input.nodeIdEncoded,
          actions: input.vaultPermissionList,
        },
      );
      // Checking if vault exists
      const vaultMeta = await vaultManager.getVaultMeta(vaultId, tran);
      if (!vaultMeta) throw new vaultsErrors.ErrorVaultsVaultUndefined();
      // Setting permissions
      const actionsSet: VaultActions = {};
      await gestaltGraph.setGestaltAction(['node', nodeId], 'scan', tran);
      for (const action of actions) {
        await acl.setVaultAction(vaultId, nodeId, action, tran);
        actionsSet[action] = null;
      }
      // Sending notification
      await notificationsManager.sendNotification(nodeId, {
        type: 'VaultShare',
        vaultId: vaultsUtils.encodeVaultId(vaultId),
        vaultName: vaultMeta.vaultName,
        actions: actionsSet,
      });
    });
    return {
      success: true,
    };
  }
}

export { vaultsPermissionSet, VaultsPermissionSetHandler };