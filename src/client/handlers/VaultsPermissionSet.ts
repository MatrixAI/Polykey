import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  PermissionSetMessage,
  SuccessMessage,
} from '../types.js';
import type ACL from '../../acl/ACL.js';
import type { VaultAction, VaultActions } from '../../vaults/types.js';
import type VaultManager from '../../vaults/VaultManager.js';
import type NotificationsManager from '../../notifications/NotificationsManager.js';
import type GestaltGraph from '../../gestalts/GestaltGraph.js';
import type { NodeId } from '../../ids/index.js';
import { UnaryHandler } from '@matrixai/rpc';
import { validateSync } from '../../validation/index.js';
import { matchSync } from '../../utils/index.js';
import * as ids from '../../ids/index.js';
import * as vaultsUtils from '../../vaults/utils.js';
import * as vaultsErrors from '../../vaults/errors.js';

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
        throw new vaultsErrors.ErrorVaultsVaultUndefined(
          `Vault "${input.nameOrId}" does not exist`,
        );
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
      if (!vaultMeta) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined(
          `Vault "${input.nameOrId}" does not exist`,
        );
      }
      // Setting permissions
      const actionsSet: VaultActions = {};
      await gestaltGraph.setGestaltAction(['node', nodeId], 'scan', tran);
      for (const action of actions) {
        await acl.setVaultAction(vaultId, nodeId, action, tran);
        actionsSet[action] = null;
      }
      // Sending notification
      await notificationsManager.sendNotification({
        nodeId: nodeId,
        data: {
          type: 'VaultShare',
          vaultId: vaultsUtils.encodeVaultId(vaultId),
          vaultName: vaultMeta.vaultName,
          actions: actionsSet,
        },
      });
    });
    return { success: true };
  };
}

export default VaultsPermissionSet;
