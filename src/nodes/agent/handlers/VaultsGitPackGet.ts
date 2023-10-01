import type { DB } from '@matrixai/db';
import type { PassThrough } from 'readable-stream';
import type { VaultName } from '../../../vaults/types';
import type ACL from '../../../acl/ACL';
import type VaultManager from '../../../vaults/VaultManager';
import type { JSONRPCRequest } from '../../../rpc/types';
import type { JSONValue } from '../../../types';
import { ReadableStream } from 'stream/web';
import * as agentErrors from '../errors';
import * as agentUtils from '../utils';
import * as validation from '../../../validation';
import * as nodesUtils from '../../utils';
import * as vaultsUtils from '../../../vaults/utils';
import * as vaultsErrors from '../../../vaults/errors';
import * as utils from '../../../utils';
import { RawHandler } from '../../../rpc/handlers';

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
  ): Promise<[JSONValue, ReadableStream<Uint8Array>]> => {
    const { vaultManager, acl, db } = this.container;
    const [headerMessage, inputStream] = input;
    const requestingNodeId = agentUtils.nodeIdFromMeta(meta);
    if (requestingNodeId == null) {
      throw new agentErrors.ErrorAgentNodeIdMissing();
    }
    const nodeIdEncoded = nodesUtils.encodeNodeId(requestingNodeId);
    const params = headerMessage.params;
    if (params == null || !utils.isObject(params)) utils.never();
    if (!('nameOrId' in params) || typeof params.nameOrId != 'string') {
      utils.never();
    }
    if (!('vaultAction' in params) || typeof params.vaultAction != 'string') {
      utils.never();
    }
    const nameOrId = params.nameOrId;
    const actionType = validation.utils.parseVaultAction(params.vaultAction);
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
    let sideBand: PassThrough;
    let progressStream: PassThrough;
    const outputStream = new ReadableStream({
      start: async (controller) => {
        const body = new Array<Uint8Array>();
        for await (const message of inputStream) {
          body.push(message);
        }
        [sideBand, progressStream] = await vaultManager.handlePackRequest(
          vaultId,
          Buffer.concat(body),
        );
        controller.enqueue(Buffer.from('0008NAK\n'));
        sideBand.on('data', async (data: Uint8Array) => {
          controller.enqueue(data);
          sideBand.pause();
        });
        sideBand.on('end', async () => {
          controller.close();
        });
        sideBand.on('error', (e) => {
          controller.error(e);
        });
        progressStream.write(Buffer.from('0014progress is at 50%\n'));
        progressStream.end();
      },
      pull: () => {
        sideBand.resume();
      },
      cancel: (e) => {
        sideBand.destroy(e);
      },
    });
    return [null, outputStream];
  }
}

export default VaultsGitPackGet;
