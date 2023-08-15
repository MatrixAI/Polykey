import type { GitPackMessage, VaultInfo } from './types';
import type { AgentRPCRequestParams, AgentRPCResponseResult } from '../types';
import type { DB } from '@matrixai/db';
import type { VaultManager } from '../../vaults';
import type { ACL } from '../../acl';
import type Logger from '@matrixai/logger';
import type { VaultsGitInfoGetMessage } from './types';
import type { VaultAction } from '../../vaults/types';
import type { JSONRPCRequest } from '@/rpc/types';
import type { ContextTimed } from '@matrixai/contexts';
import type { JSONValue } from '@/types';
import { ReadableStream } from 'stream/web';
import * as agentErrors from '../errors';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import { RawHandler } from '../../rpc/handlers';
import { validateSync } from '../../validation';
import { matchSync, never } from '../../utils';
import * as validationUtils from '../../validation/utils';
import * as nodesUtils from '../../nodes/utils';
import * as agentUtils from '../utils';
import * as utils from '../../utils';

class VaultsGitInfoGetHandler extends RawHandler<{
  db: DB;
  vaultManager: VaultManager;
  acl: ACL;
  logger: Logger;
}> {
  public async handle(
    input: [JSONRPCRequest, ReadableStream<Uint8Array>],
    cancel: (reason?: any) => void,
    meta: Record<string, JSONValue> | undefined,
    ctx: ContextTimed,
  ): Promise<[JSONValue, ReadableStream<Uint8Array>]> {
    const { db, vaultManager, acl } = this.container;
    const [headerMessage, inputStream] = input;
    const params = headerMessage.params;
    if (params == null || !utils.isObject(params)) never();
    if (
      !('vaultNameOrId' in params) ||
      typeof params.vaultNameOrId != 'string'
    ) {
      never();
    }
    if (!('action' in params) || typeof params.action != 'string') never();
    const vaultNameOrId = params.vaultNameOrId;
    const actionType = validationUtils.parseVaultAction(params.action);
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

    // TODO: Needs to handle cancellation
    const stream = new ReadableStream({
      start: async (controller) => {
        for await (const buffer of vaultManager.handleInfoRequest(
          data.vaultId,
        )) {
          if (buffer != null) {
            controller.enqueue(buffer);
          } else {
            break;
          }
        }
        controller.close();
      },
    });

    return [
      {
        vaultName: data.vaultName,
        vaultIdEncoded: vaultsUtils.encodeVaultId(data.vaultId),
      },
      stream,
    ];
  }
}

export { VaultsGitInfoGetHandler };
