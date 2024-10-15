import type { DB } from '@matrixai/db';
import type Logger from '@matrixai/logger';
import type { JSONObject, JSONRPCRequest } from '@matrixai/rpc';
import type { ContextTimed } from '@matrixai/contexts';
import type ACL from '../../../acl/ACL';
import type VaultManager from '../../../vaults/VaultManager';
import type { JSONValue } from '../../../types';
import { ReadableStream } from 'stream/web';
import { RawHandler } from '@matrixai/rpc';
import * as agentErrors from '../errors';
import * as vaultsUtils from '../../../vaults/utils';
import * as vaultsErrors from '../../../vaults/errors';
import * as nodesUtils from '../../utils';
import * as agentUtils from '../utils';
import * as utils from '../../../utils';

/**
 * Gets the git info of a vault.
 */
class VaultsGitInfoGet extends RawHandler<{
  db: DB;
  vaultManager: VaultManager;
  acl: ACL;
  logger: Logger;
}> {
  public handle = async (
    input: [JSONRPCRequest, ReadableStream<Uint8Array>],
    _cancel,
    meta: Record<string, JSONValue> | undefined,
    _ctx: ContextTimed, // TODO: use
  ): Promise<[JSONObject, ReadableStream<Uint8Array>]> => {
    const { db, vaultManager, acl } = this.container;
    const [headerMessage, inputStream] = input;
    await inputStream.cancel();
    const params = headerMessage.params;
    if (params == null || !utils.isObject(params)) {
      utils.never('params must be defined and an object');
    }
    if (
      !('vaultNameOrId' in params) ||
      typeof params.vaultNameOrId != 'string'
    ) {
      utils.never('vaultNameOrId must be defined and a string');
    }
    if (!('action' in params) || typeof params.action != 'string') {
      utils.never('action must be defined and a string');
    }
    const vaultNameOrId = params.vaultNameOrId;
    const actionType = vaultsUtils.parseVaultAction(params.action);
    const data = await db.withTransactionF(async (tran) => {
      const vaultIdFromName = await vaultManager.getVaultId(
        vaultNameOrId,
        tran,
      );
      const vaultId =
        vaultIdFromName ?? vaultsUtils.decodeVaultId(vaultNameOrId);
      if (vaultId == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined();
      }
      const vaultName = (await vaultManager.getVaultMeta(vaultId, tran))
        ?.vaultName;
      if (vaultName == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined();
      }
      // Getting the NodeId from the connection metadata
      const requestingNodeId = agentUtils.nodeIdFromMeta(meta);
      if (requestingNodeId == null) {
        throw new agentErrors.ErrorAgentNodeIdMissing();
      }
      const nodeIdEncoded = nodesUtils.encodeNodeId(requestingNodeId);
      const permissions = await acl.getNodePerm(requestingNodeId, tran);
      if (permissions == null) {
        throw new vaultsErrors.ErrorVaultsPermissionDenied(
          `No permissions found for ${nodeIdEncoded}`,
        );
      }
      const vaultPerms = permissions.vaults[vaultId];
      if (vaultPerms?.[actionType] !== null) {
        throw new vaultsErrors.ErrorVaultsPermissionDenied(
          `${nodeIdEncoded} does not have permission to ${actionType} from vault ${vaultsUtils.encodeVaultId(
            vaultId,
          )}`,
        );
      }
      return {
        vaultId,
        vaultName,
      };
    });

    let handleInfoRequestGen: AsyncGenerator<Buffer>;
    const stream = new ReadableStream({
      start: async () => {
        handleInfoRequestGen = vaultManager.handleInfoRequest(data.vaultId);
      },
      pull: async (controller) => {
        const result = await handleInfoRequestGen.next();
        if (result.done) {
          controller.close();
          return;
        } else {
          controller.enqueue(result.value);
        }
      },
      cancel: async (reason) => {
        await handleInfoRequestGen.throw(reason).catch(() => {});
      },
    });
    return [
      {
        vaultName: data.vaultName,
        vaultIdEncoded: vaultsUtils.encodeVaultId(data.vaultId),
      },
      stream,
    ];
  };
}

export default VaultsGitInfoGet;
