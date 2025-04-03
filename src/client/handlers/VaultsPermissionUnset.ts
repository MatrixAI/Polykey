import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  PermissionSetMessage,
  SuccessMessage,
} from '../types.js';
import type { VaultAction } from '../../vaults/types.js';
import type { NodeId } from '../../ids/index.js';
import type VaultManager from '../../vaults/VaultManager.js';
import type GestaltGraph from '../../gestalts/GestaltGraph.js';
import type ACL from '../../acl/ACL.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids/index.js';
import * as vaultsUtils from '../../vaults/utils.js';
import * as vaultsErrors from '../../vaults/errors.js';
import { validateSync } from '../../validation/index.js';
import { matchSync } from '../../utils/index.js';

class VaultsPermissionUnset extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
    gestaltGraph: GestaltGraph;
    acl: ACL;
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
    }: {
      db: DB;
      vaultManager: VaultManager;
      gestaltGraph: GestaltGraph;
      acl: ACL;
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
      if (!vaultMeta) throw new vaultsErrors.ErrorVaultsVaultUndefined();
      // Unsetting permissions
      await gestaltGraph.setGestaltAction(['node', nodeId], 'scan', tran);
      for (const action of actions) {
        await acl.unsetVaultAction(vaultId, nodeId, action, tran);
      }
      // We need to check if there are still shared vaults
      const nodePermissions = await acl.getNodePerm(nodeId, tran);
      // Remove scan permissions if no more shared vaults
      if (nodePermissions != null) {
        // Counting total number of permissions
        const totalPermissions = Object.keys(nodePermissions.vaults)
          .map((key) => Object.keys(nodePermissions.vaults[key]).length)
          .reduce((prev, current) => current + prev);
        // If no permissions are left then we remove the scan permission
        if (totalPermissions === 0) {
          await gestaltGraph.unsetGestaltAction(['node', nodeId], 'scan', tran);
        }
      }
    });
    // Formatting response
    return { success: true };
  };
}

export default VaultsPermissionUnset;
