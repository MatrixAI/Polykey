import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { DB } from '@matrixai/db';
import type ACL from '../../acl/ACL';
import type { VaultIdentifierMessage, VaultPermissionMessage } from './types';
import type { VaultAction, VaultActions } from '../../vaults/types';
import type { NodeId, NodeIdEncoded } from '../../ids';
import { IdInternal } from '@matrixai/id';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as nodesUtils from '../../nodes/utils';
import { ServerHandler } from '../../rpc/handlers';

class VaultsPermissionGetHandler extends ServerHandler<
  {
    db: DB;
    vaultManager: VaultManager;
    acl: ACL;
  },
  ClientRPCRequestParams<VaultIdentifierMessage>,
  ClientRPCResponseResult<VaultPermissionMessage>
> {
  public async *handle(
    input: ClientRPCRequestParams<VaultIdentifierMessage>,
  ): AsyncGenerator<ClientRPCResponseResult<VaultPermissionMessage>> {
    const { db, vaultManager, acl } = this.container;
    const [rawPermissions, vaultId] = await db.withTransactionF(
      async (tran) => {
        const vaultIdFromName = await vaultManager.getVaultId(
          input.nameOrId,
          tran,
        );
        const vaultId =
          vaultIdFromName ?? vaultsUtils.decodeVaultId(input.nameOrId);
        if (vaultId == null) {
          throw new vaultsErrors.ErrorVaultsVaultUndefined();
        }
        // Getting permissions
        return [await acl.getVaultPerm(vaultId, tran), vaultId];
      },
    );
    const permissionList: Record<NodeIdEncoded, VaultActions> = {};
    // Getting the relevant information
    for (const nodeId in rawPermissions) {
      permissionList[nodeId] = rawPermissions[nodeId].vaults[vaultId];
    }
    // Constructing the message
    for (const nodeIdString in permissionList) {
      const nodeId = IdInternal.fromString<NodeId>(nodeIdString);
      const actions = Object.keys(
        permissionList[nodeIdString],
      ) as Array<VaultAction>;
      yield {
        vaultIdEncoded: vaultsUtils.encodeVaultId(vaultId),
        nodeIdEncoded: nodesUtils.encodeNodeId(nodeId),
        vaultPermissionList: actions,
      };
    }
  }
}

export { VaultsPermissionGetHandler };
