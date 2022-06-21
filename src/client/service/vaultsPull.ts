import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { VaultName } from '../../vaults/types';
import type { NodeId } from '../../nodes/types';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import type Logger from '@matrixai/logger';
import type * as grpc from '@grpc/grpc-js';
import * as grpcUtils from '../../grpc/utils';
import * as grpcErrors from '../../grpc/errors';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as nodesErrors from '../../nodes/errors';
import { matchSync } from '../../utils';
import * as clientUtils from '../utils';

function vaultsPull({
  authenticate,
  vaultManager,
  db,
  logger,
}: {
  authenticate: Authenticate;
  vaultManager: VaultManager;
  db: DB;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<vaultsPB.Pull, utilsPB.StatusMessage>,
    callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.StatusMessage();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      let pullVaultId;
      const pullVaultMessage = call.request.getPullVault();
      if (pullVaultMessage == null) {
        pullVaultId = null;
      } else {
        pullVaultId = vaultsUtils.decodeVaultId(pullVaultMessage.getNameOrId());
        pullVaultId = pullVaultId ?? pullVaultMessage.getNameOrId();
        if (pullVaultId == null) pullVaultId = pullVaultMessage.getNameOrId();
      }
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
          nodeId,
        }: {
          nodeId: NodeId | undefined;
        } = validateSync(
          (keyPath, value) => {
            return matchSync(keyPath)(
              [
                ['nodeId'],
                () => (value ? validationUtils.parseNodeId(value) : undefined),
              ],
              () => value,
            );
          },
          {
            nodeId: call.request.getNode()?.getNodeId(),
          },
        );
        await vaultManager.pullVault({
          vaultId,
          pullNodeId: nodeId,
          pullVaultNameOrId: pullVaultId,
          tran,
        });
      });
      response.setSuccess(true);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e, [
        vaultsErrors.ErrorVaultsVaultUndefined,
        nodesErrors.ErrorNodeGraphNodeIdNotFound,
        [grpcErrors.ErrorPolykeyRemote, vaultsErrors.ErrorVaultsVaultUndefined],
      ]) && logger.error(`${vaultsPull.name}:${e}`);
      return;
    }
  };
}

export default vaultsPull;
