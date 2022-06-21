import type { DB } from '@matrixai/db';
import type { VaultName, VaultAction } from '../../vaults/types';
import type VaultManager from '../../vaults/VaultManager';
import type ACL from '../../acl/ACL';
import type { ConnectionInfoGet } from '../../agent/types';
import type Logger from '@matrixai/logger';
import * as grpc from '@grpc/grpc-js';
import * as grpcUtils from '../../grpc/utils';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import * as nodesUtils from '../../nodes/utils';
import { matchSync } from '../../utils';
import * as agentErrors from '../errors';
import * as agentUtils from '../utils';

function vaultsGitInfoGet({
  vaultManager,
  acl,
  db,
  logger,
  connectionInfoGet,
}: {
  vaultManager: VaultManager;
  acl: ACL;
  db: DB;
  logger: Logger;
  connectionInfoGet: ConnectionInfoGet;
}) {
  return async (
    call: grpc.ServerWritableStream<vaultsPB.InfoRequest, vaultsPB.PackChunk>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call, true);
    try {
      await db.withTransactionF(async (tran) => {
        const vaultIdFromName = await vaultManager.getVaultId(
          call.request.getVault()?.getNameOrId() as VaultName,
          tran,
        );
        const vaultId =
          vaultIdFromName ??
          vaultsUtils.decodeVaultId(call.request.getVault()?.getNameOrId());
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
            actionType: call.request.getAction(),
          },
        );
        const vaultName = (await vaultManager.getVaultMeta(vaultId, tran))
          ?.vaultName;
        if (vaultName == null) {
          throw new vaultsErrors.ErrorVaultsVaultUndefined();
        }
        // Getting the NodeId from the ReverseProxy connection info
        const connectionInfo = connectionInfoGet(call);
        // If this is getting run the connection exists
        // It SHOULD exist here
        if (connectionInfo == null) {
          throw new agentErrors.ErrorConnectionInfoMissing();
        }
        const nodeId = connectionInfo.remoteNodeId;
        const nodeIdEncoded = nodesUtils.encodeNodeId(nodeId);
        const permissions = await acl.getNodePerm(nodeId, tran);
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
        const meta = new grpc.Metadata();
        meta.set('vaultName', vaultName);
        meta.set('vaultId', vaultsUtils.encodeVaultId(vaultId));
        genWritable.stream.sendMetadata(meta);
        const response = new vaultsPB.PackChunk();
        const responseGen = vaultManager.handleInfoRequest(vaultId, tran);
        for await (const byte of responseGen) {
          if (byte !== null) {
            response.setChunk(byte);
            await genWritable.next(response);
          } else {
            await genWritable.next(null);
          }
        }
      });
      await genWritable.next(null);
      return;
    } catch (e) {
      await genWritable.throw(e);
      !agentUtils.isAgentClientError(e, [
        vaultsErrors.ErrorVaultsVaultUndefined,
        agentErrors.ErrorConnectionInfoMissing,
        vaultsErrors.ErrorVaultsPermissionDenied,
      ]) && logger.error(`${vaultsGitInfoGet.name}:${e}`);
      return;
    }
  };
}

export default vaultsGitInfoGet;
