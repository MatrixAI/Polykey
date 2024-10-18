import type { ContextTimed } from '@matrixai/contexts';
import type { DB } from '@matrixai/db';
import type { JSONValue } from '@matrixai/rpc';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  VaultIdentifierMessage,
  VaultPermissionMessage,
} from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type ACL from '../../acl/ACL';
import type { VaultAction, VaultActions } from '../../vaults/types';
import type { NodeId, NodeIdEncoded } from '../../ids';
import { IdInternal } from '@matrixai/id';
import { ServerHandler } from '@matrixai/rpc';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as nodesUtils from '../../nodes/utils';

class VaultsPermissionGet extends ServerHandler<
  {
    db: DB;
    vaultManager: VaultManager;
    acl: ACL;
  },
  ClientRPCRequestParams<VaultIdentifierMessage>,
  ClientRPCResponseResult<VaultPermissionMessage>
> {
  public handle = async function* (
    input: ClientRPCRequestParams<VaultIdentifierMessage>,
    _cancel: (reason?: any) => void,
    _meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): AsyncGenerator<ClientRPCResponseResult<VaultPermissionMessage>> {
    const {
      db,
      vaultManager,
      acl,
    }: { db: DB; vaultManager: VaultManager; acl: ACL } = this.container;
    const [rawPermissions, vaultId] = await db.withTransactionF(
      async (tran) => {
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
      ctx.signal.throwIfAborted();
      yield {
        vaultIdEncoded: vaultsUtils.encodeVaultId(vaultId),
        nodeIdEncoded: nodesUtils.encodeNodeId(nodeId),
        vaultPermissionList: actions,
      };
    }
  };
}

export default VaultsPermissionGet;
