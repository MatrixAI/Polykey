import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { VaultAction } from '../../vaults/types';
import type { NodeId } from '../../ids';
import type { DB } from '@matrixai/db';
import type VaultManager from '../../vaults/VaultManager';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type ACL from '../../acl/ACL';
import type { PermissionSetMessage, SuccessMessage } from './types';
import * as vaultsUtils from '../../vaults/utils';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils';
import { validateSync } from '../../validation';
import * as vaultsErrors from '../../vaults/errors';
import { UnaryHandler } from '../../rpc/handlers';

class VaultsPermissionUnsetHandler extends UnaryHandler<
  {
    db: DB;
    vaultManager: VaultManager;
    gestaltGraph: GestaltGraph;
    acl: ACL;
  },
  ClientRPCRequestParams<PermissionSetMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public async handle(
    input: ClientRPCRequestParams<PermissionSetMessage>,
  ): Promise<ClientRPCResponseResult<SuccessMessage>> {
    const { db, vaultManager, gestaltGraph, acl } = this.container;
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
    return {
      success: true,
    };
  }
}

export { VaultsPermissionUnsetHandler };
