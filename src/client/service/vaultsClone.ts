import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type VaultManager from '../../vaults/VaultManager';
import type { NodeId } from '../../nodes/types';
import type * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import type Logger from '@matrixai/logger';
import type * as grpc from '@grpc/grpc-js';
import * as grpcUtils from '../../grpc/utils';
import * as grpcErrors from '../../grpc/errors';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as nodesErrors from '../../nodes/errors';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsErrors from '../../vaults/errors';
import { matchSync } from '../../utils';
import * as clientUtils from '../utils';

function vaultsClone({
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
    call: grpc.ServerUnaryCall<vaultsPB.Clone, utilsPB.StatusMessage>,
    callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.StatusMessage();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      // Node id
      const {
        nodeId,
      }: {
        nodeId: NodeId;
      } = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['nodeId'], () => validationUtils.parseNodeId(value)],
            () => value,
          );
        },
        {
          nodeId: call.request.getNode()?.getNodeId(),
        },
      );
      // Vault id
      let vaultId;
      const vaultNameOrId = call.request.getVault()?.getNameOrId();
      vaultId = vaultsUtils.decodeVaultId(vaultNameOrId);
      vaultId = vaultId ?? vaultNameOrId;
      await db.withTransactionF(async (tran) => {
        await vaultManager.cloneVault(nodeId, vaultId, tran);
      });
      response.setSuccess(true);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e, [
        nodesErrors.ErrorNodeGraphNodeIdNotFound,
        vaultsErrors.ErrorVaultsNameConflict,
        [grpcErrors.ErrorPolykeyRemote, vaultsErrors.ErrorVaultsVaultUndefined],
      ]) && logger.error(`${vaultsClone.name}:${e}`);
      return;
    }
  };
}

export default vaultsClone;
