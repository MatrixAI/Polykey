import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  PermissionSetMessage,
  SuccessMessage,
} from '../types';
import type ACL from '../../acl/ACL';
import type { VaultAction, VaultActions } from '../../vaults/types';
import type { NodeId } from '../../ids';
import type VaultManager from '../../vaults/VaultManager';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';

class VaultsPermissionSet extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
    gestaltGraph: GestaltGraph;
    acl: ACL;
    notificationsManager: NotificationsManager;
  },
  ClientRPCRequestParams<PermissionSetMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<PermissionSetMessage>,
  ): Promise<ClientRPCResponseResult<SuccessMessage>> => {
    const {
      db,
      vaultManager,
      gestaltGraph,
      acl,
      notificationsManager,
    }: {
      db: DB;
      vaultManager: VaultManager;
      gestaltGraph: GestaltGraph;
      acl: ACL;
      notificationsManager: NotificationsManager;
    } = this.container;
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
            [['nodeId'], () => ids.parseNodeId(value)],
            [['actions'], () => value.map(vaultsUtils.parseVaultAction)],
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
      await notificationsManager.sendNotification({
        nodeId,
        data: {
          type: 'VaultShare',
          vaultId: vaultsUtils.encodeVaultId(vaultId),
          vaultName: vaultMeta.vaultName,
          actions: actionsSet,
        },
      });
    });
    return { type: 'success', success: true };
  };
}

export default VaultsPermissionSet;
