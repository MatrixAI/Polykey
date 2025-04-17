import type { DB } from '@matrixai/db';
import type Logger from '@matrixai/logger';
import type { JSONObject, JSONRPCRequest } from '@matrixai/rpc';
import type { ContextTimed } from '@matrixai/contexts';
import type ACL from '../../../acl/ACL.js';
import type VaultManager from '../../../vaults/VaultManager.js';
import type { JSONValue } from '../../../types.js';
import { ReadableStream } from 'stream/web';
import { RawHandler } from '@matrixai/rpc';
import * as agentUtils from '../utils.js';
import * as nodesErrors from '../../errors.js';
import * as nodesUtils from '../../utils.js';
import * as vaultsUtils from '../../../vaults/utils.js';
import * as vaultsErrors from '../../../vaults/errors.js';
import * as utils from '../../../utils/index.js';

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
    _cancel: (reason?: any) => void,
    meta: Record<string, JSONValue>,
    ctx: ContextTimed,
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
        throw new nodesErrors.ErrorNodeConnectionInvalidIdentity();
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
        // Automatically handle the transaction lifetime
        handleInfoRequestGen = vaultManager.handleInfoRequest(
          data.vaultId,
          undefined,
          ctx,
        );
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
