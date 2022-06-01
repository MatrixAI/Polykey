import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type { VaultName, VaultId, VaultAction } from '../../vaults/types';
import type VaultManager from '../../vaults/VaultManager';
import type { ConnectionInfoGet } from '../../agent/types';
import type ACL from '../../acl/ACL';
import type KeyManager from '../../keys/KeyManager';
import type Logger from '@matrixai/logger';
import * as nodesUtils from '../../nodes/utils';
import * as grpcUtils from '../../grpc/utils';
import * as vaultsErrors from '../../vaults/errors';
import * as vaultsUtils from '../../vaults/utils';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils';
import * as agentErrors from '../errors';
import * as agentUtils from '../utils';

function vaultsGitPackGet({
  vaultManager,
  acl,
  db,
  keyManager,
  logger,
  connectionInfoGet,
}: {
  vaultManager: VaultManager;
  acl: ACL;
  db: DB;
  keyManager: KeyManager;
  logger: Logger;
  connectionInfoGet: ConnectionInfoGet;
}) {
  return async (
    call: grpc.ServerDuplexStream<vaultsPB.PackChunk, vaultsPB.PackChunk>,
  ): Promise<void> => {
    const nodeId = keyManager.getNodeId();
    const genDuplex = grpcUtils.generatorDuplex(
      call,
      { nodeId, command: vaultsGitPackGet.name },
      true,
    );
    try {
      const clientBodyBuffers: Uint8Array[] = [];
      const clientRequest = (await genDuplex.read()).value;
      clientBodyBuffers.push(clientRequest!.getChunk_asU8());
      const body = Buffer.concat(clientBodyBuffers);
      const meta = call.metadata;
      // Getting the NodeId from the ReverseProxy connection info
      const connectionInfo = connectionInfoGet(call);
      // If this is getting run the connection exists
      // It SHOULD exist here
      if (connectionInfo == null) {
        throw new agentErrors.ErrorConnectionInfoMissing();
      }
      const nodeId = connectionInfo.remoteNodeId;
      const nodeIdEncoded = nodesUtils.encodeNodeId(nodeId);
      await db.withTransactionF(async (tran) => {
        const vaultIdFromName = await vaultManager.getVaultId(
          meta.get('vaultNameOrId').pop()!.toString() as VaultName,
          tran,
        );
        const {
          vaultId,
          actionType,
        }: {
          vaultId: VaultId;
          actionType: VaultAction;
        } = validateSync(
          (keyPath, value) => {
            return matchSync(keyPath)(
              [
                ['vaultId'],
                () => vaultIdFromName ?? validationUtils.parseVaultId(value),
              ],
              [['actionType'], () => validationUtils.parseVaultAction(value)],
              () => value,
            );
          },
          {
            vaultId: meta.get('vaultNameOrId').pop(),
            actionType: meta.get('vaultAction').pop(),
          },
        );
        // Checking permissions
        const permissions = await acl.getNodePerm(nodeId, tran);
        const vaultPerms = permissions?.vaults[vaultId];
        if (vaultPerms?.[actionType] !== null) {
          throw new vaultsErrors.ErrorVaultsPermissionDenied(
            `${nodeIdEncoded} does not have permission to ${actionType} from vault ${vaultsUtils.encodeVaultId(
              vaultId,
            )}`,
          );
        }
        const response = new vaultsPB.PackChunk();
        const [sideBand, progressStream] = await vaultManager.handlePackRequest(
          vaultId,
          Buffer.from(body),
          tran,
        );
        response.setChunk(Buffer.from('0008NAK\n'));
        await genDuplex.write(response);
        const responseBuffers: Uint8Array[] = [];
        await new Promise<void>((resolve, reject) => {
          sideBand.on('data', async (data: Uint8Array) => {
            responseBuffers.push(data);
          });
          sideBand.on('end', async () => {
            response.setChunk(Buffer.concat(responseBuffers));
            await genDuplex.write(response);
            resolve();
          });
          sideBand.on('error', (err) => {
            reject(err);
          });
          progressStream.write(Buffer.from('0014progress is at 50%\n'));
          progressStream.end();
        });
      });
      await genDuplex.next(null);
      return;
    } catch (e) {
      await genDuplex.throw(e);
      !agentUtils.isClientError(e, [
        agentErrors.ErrorConnectionInfoMissing,
        vaultsErrors.ErrorVaultsPermissionDenied,
        vaultsErrors.ErrorVaultsVaultUndefined,
      ]) && logger.error(e);
      return;
    }
  };
}

export default vaultsGitPackGet;
