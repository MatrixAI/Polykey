import type { GitPackMessage, VaultInfo } from './types';
import type { AgentRPCRequestParams, AgentRPCResponseResult } from '../types';
import type { DB } from '@matrixai/db';
import type { VaultManager } from '../../vaults';
import type { ACL } from '../../acl';
import type Logger from '@matrixai/logger';
import type { VaultsGitInfoGetMessage } from './types';
import type { VaultAction } from '../../vaults/types';
import * as agentErrors from '../errors';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import { ServerHandler } from '../../rpc/handlers';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as validationUtils from '../../validation/utils';
import * as nodesUtils from '../../nodes/utils';
import * as agentUtils from '../utils';

class VaultsGitInfoGetHandler extends ServerHandler<
  {
    db: DB;
    vaultManager: VaultManager;
    acl: ACL;
    logger: Logger;
  },
  AgentRPCRequestParams<VaultsGitInfoGetMessage>,
  AgentRPCResponseResult<VaultInfo | GitPackMessage>
> {
  public async *handle(
    input: AgentRPCRequestParams<VaultsGitInfoGetMessage>,
    _cancel,
    meta,
  ): AsyncGenerator<VaultInfo | GitPackMessage> {
    const { db, vaultManager, acl } = this.container;
    yield* db.withTransactionG(async function* (
      tran,
    ): AsyncGenerator<VaultInfo | GitPackMessage> {
      const vaultIdFromName = await vaultManager.getVaultId(
        input.vaultNameOrId,
        tran,
      );
      const vaultId =
        vaultIdFromName ?? vaultsUtils.decodeVaultId(input.vaultNameOrId);
      if (vaultId == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined();
      }
      const {
        actionType,
      }: {
        actionType: VaultAction;
      } = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['actionType'], () => validationUtils.parseVaultAction(value)],
            () => value,
          );
        },
        {
          actionType: input.action,
        },
      );
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

      yield {
        vaultName: vaultName,
        vaultIdEncoded: vaultsUtils.encodeVaultId(vaultId),
      };
      for await (const byte of vaultManager.handleInfoRequest(vaultId, tran)) {
        if (byte !== null) {
          yield {
            chunk: byte.toString('binary'),
          };
        } else {
          return;
        }
      }
    });
  }
}

export { VaultsGitInfoGetHandler };
