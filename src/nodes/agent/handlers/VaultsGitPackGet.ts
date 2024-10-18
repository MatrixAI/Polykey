import type { DB } from '@matrixai/db';
import type { JSONObject, JSONRPCRequest } from '@matrixai/rpc';
import type {ContextTimed} from '@matrixai/contexts';
import type { VaultName } from '../../../vaults/types';
import type ACL from '../../../acl/ACL';
import type VaultManager from '../../../vaults/VaultManager';
import { ReadableStream } from 'stream/web';
import { RawHandler } from '@matrixai/rpc';
import * as agentErrors from '../errors';
import * as agentUtils from '../utils';
import * as nodesUtils from '../../utils';
import * as vaultsUtils from '../../../vaults/utils';
import * as vaultsErrors from '../../../vaults/errors';
import * as utils from '../../../utils';

/**
 * Gets the git pack of a vault.
 */
class VaultsGitPackGet extends RawHandler<{
  vaultManager: VaultManager;
  acl: ACL;
  db: DB;
}> {
  public handle = async (
    input: [JSONRPCRequest, ReadableStream<Uint8Array>],
    _cancel,
    meta,
    ctx: ContextTimed,
  ): Promise<[JSONObject, ReadableStream<Uint8Array>]> => {
    const { vaultManager, acl, db } = this.container;
    const [headerMessage, inputStream] = input;
    const requestingNodeId = agentUtils.nodeIdFromMeta(meta);
    if (requestingNodeId == null) {
      throw new agentErrors.ErrorAgentNodeIdMissing();
    }
    const nodeIdEncoded = nodesUtils.encodeNodeId(requestingNodeId);
    const params = headerMessage.params;
    if (params == null || !utils.isObject(params)) {
      utils.never('params must be defined and an object');
    }
    if (!('nameOrId' in params) || typeof params.nameOrId != 'string') {
      utils.never('nameOrId must be defined and a string');
    }
    if (!('vaultAction' in params) || typeof params.vaultAction != 'string') {
      utils.never('vaultAction must be defined and a string');
    }
    const nameOrId = params.nameOrId;
    const actionType = vaultsUtils.parseVaultAction(params.vaultAction);
    const [vaultIdFromName, permissions] = await db.withTransactionF(
      async (tran) => {
        const vaultIdFromName = await vaultManager.getVaultId(
          nameOrId as VaultName,
          tran,
        );
        const permissions = await acl.getNodePerm(requestingNodeId, tran);

        return [vaultIdFromName, permissions];
      },
    );
    const vaultId = vaultIdFromName ?? vaultsUtils.decodeVaultId(nameOrId);
    if (vaultId == null) {
      throw new vaultsErrors.ErrorVaultsVaultUndefined();
    }
    // Checking permissions
    const vaultPerms = permissions?.vaults[vaultId];
    if (vaultPerms?.[actionType] !== null) {
      throw new vaultsErrors.ErrorVaultsPermissionDenied(
        `${nodeIdEncoded} does not have permission to ${actionType} from vault ${vaultsUtils.encodeVaultId(
          vaultId,
        )}`,
      );
    }

    // Getting data
    let packRequestGen: AsyncGenerator<Buffer, void, void>;
    const outputStream = new ReadableStream<Buffer>({
      start: async () => {
        const body: Array<Buffer> = [];
        for await (const message of inputStream) {
          body.push(Buffer.from(message));
        }
        packRequestGen = vaultManager.handlePackRequest(vaultId, body);
      },
      pull: async (controller) => {
        const next = await packRequestGen.next();
        if (next.done === true) return controller.close();
        controller.enqueue(next.value);
      },
      cancel: async () => {
        await packRequestGen.return();
      },
    });
    return [{}, outputStream];
  };
}

export default VaultsGitPackGet;
