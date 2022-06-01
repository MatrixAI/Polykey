import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type { VaultName, VaultId } from '../../vaults/types';
import type VaultManager from '../../vaults/VaultManager';
import type Logger from '@matrixai/logger';
import type * as grpc from '@grpc/grpc-js';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import * as grpcUtils from '../../grpc/utils';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import * as vaultsErrors from '../../vaults/errors';
import { matchSync } from '../../utils';
import * as clientUtils from '../utils';

function vaultsLog({
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
    call: grpc.ServerWritableStream<vaultsPB.Log, vaultsPB.LogEntry>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call, false);
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const log = await db.withTransactionF(async (tran) => {
        const vaultIdFromName = await vaultManager.getVaultId(
          call.request.getVault()?.getNameOrId() as VaultName,
          tran,
        );
        const {
          vaultId,
        }: {
          vaultId: VaultId;
        } = validateSync(
          (keyPath, value) => {
            return matchSync(keyPath)(
              [
                ['vaultId'],
                () => vaultIdFromName ?? validationUtils.parseVaultId(value),
              ],
              () => value,
            );
          },
          {
            vaultId: call.request.getVault()?.getNameOrId(),
          },
        );
        // Getting the log
        const depth = call.request.getLogDepth();
        let commitId: string | undefined = call.request.getCommitId();
        commitId = commitId ? commitId : undefined;
        return await vaultManager.withVaults(
          [vaultId],
          async (vault) => {
            return await vault.log(commitId, depth);
          },
          tran,
        );
      });
      const vaultsLogEntryMessage = new vaultsPB.LogEntry();
      for (const entry of log) {
        vaultsLogEntryMessage.setOid(entry.commitId);
        vaultsLogEntryMessage.setCommitter(entry.committer.name);
        const timestampMessage = new Timestamp();
        timestampMessage.fromDate(entry.committer.timestamp);
        vaultsLogEntryMessage.setTimeStamp(timestampMessage);
        vaultsLogEntryMessage.setMessage(entry.message);
        await genWritable.next(vaultsLogEntryMessage);
      }
      await genWritable.next(null);
      return;
    } catch (e) {
      await genWritable.throw(e);
      !clientUtils.isClientError(e, [
        vaultsErrors.ErrorVaultsVaultUndefined,
        vaultsErrors.ErrorVaultReferenceInvalid,
      ]) && logger.error(e);
      return;
    }
  };
}

export default vaultsLog;
