import type { VaultAction, VaultName } from '../../vaults/types';
import type VaultManager from '../../vaults/VaultManager';
import type ACL from '../../acl/ACL';
import type { DB } from '@matrixai/db';
import type { GitPackMessage, VaultsGitPackGetMessage } from './types';
import type { AgentRPCRequestParams, AgentRPCResponseResult } from '../types';
import * as networkUtils from '../../network/utils';
import * as nodesUtils from '../../nodes/utils';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as validationUtils from '../../validation/utils';
import { ServerHandler } from '../../rpc/handlers';

class VaultsGitPackGetHandler extends ServerHandler<
  {
    vaultManager: VaultManager;
    acl: ACL;
    db: DB;
  },
  AgentRPCRequestParams<VaultsGitPackGetMessage>,
  AgentRPCResponseResult<GitPackMessage>
> {
  public async *handle(
    input: AgentRPCRequestParams<VaultsGitPackGetMessage>,
    _,
    meta,
  ): AsyncGenerator<AgentRPCResponseResult<GitPackMessage>> {
    const { vaultManager, acl, db } = this.container;
    const requestingNodeId = networkUtils.nodeIdFromMeta(meta);
    const nodeIdEncoded = nodesUtils.encodeNodeId(requestingNodeId);
    const nameOrId = meta.get('vaultNameOrId').pop()!.toString();
    yield* db.withTransactionG(async function* (
      tran,
    ): AsyncGenerator<AgentRPCResponseResult<GitPackMessage>> {
      const vaultIdFromName = await vaultManager.getVaultId(
        nameOrId as VaultName,
        tran,
      );
      const vaultId = vaultIdFromName ?? vaultsUtils.decodeVaultId(nameOrId);
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
          actionType: meta.get('vaultAction').pop()!.toString(),
        },
      );
      // Checking permissions
      const permissions = await acl.getNodePerm(requestingNodeId, tran);
      const vaultPerms = permissions?.vaults[vaultId];
      if (vaultPerms?.[actionType] !== null) {
        throw new vaultsErrors.ErrorVaultsPermissionDenied(
          `${nodeIdEncoded} does not have permission to ${actionType} from vault ${vaultsUtils.encodeVaultId(
            vaultId,
          )}`,
        );
      }
      const [sideBand, progressStream] = await vaultManager.handlePackRequest(
        vaultId,
        Buffer.from(input.body, 'utf-8'),
        tran,
      );
      yield {
        chunk: Buffer.from('0008NAK\n').toString('binary'),
      };
      const responseBuffers: Uint8Array[] = [];
      // FIXME: this WHOLE thing needs to change, why are we streaming when we send monolithic messages?
      const result = await new Promise<string>((resolve, reject) => {
        sideBand.on('data', async (data: Uint8Array) => {
          responseBuffers.push(data);
        });
        sideBand.on('end', async () => {
          const result = Buffer.concat(responseBuffers).toString('binary');
          resolve(result);
        });
        sideBand.on('error', (err) => {
          reject(err);
        });
        progressStream.write(Buffer.from('0014progress is at 50%\n'));
        progressStream.end();
      });
      yield {
        chunk: result,
      };
    });
    return;
  }
}

export { VaultsGitPackGetHandler };
