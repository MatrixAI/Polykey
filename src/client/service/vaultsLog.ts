import type { Authenticate } from '../types';
import type { VaultId, VaultName } from '../../vaults/types';
import type { VaultManager } from '../../vaults';
import * as grpc from '@grpc/grpc-js';
import { utils as idUtils } from '@matrixai/id';
import { utils as grpcUtils } from '../../grpc';
import { errors as vaultsErrors } from '../../vaults';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';

function decodeVaultId(input: string): VaultId | undefined {
  return idUtils.fromMultibase(input)
    ? (idUtils.fromMultibase(input) as VaultId)
    : undefined;
}

function vaultsLog({
  vaultManager,
  authenticate,
}: {
  vaultManager: VaultManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerWritableStream<vaultsPB.Log, vaultsPB.LogEntry>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call);
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      // Getting the vault.
      const vaultsLogMessage = call.request;
      const vaultMessage = vaultsLogMessage.getVault();
      if (vaultMessage == null) {
        await genWritable.throw({ code: grpc.status.NOT_FOUND });
        return;
      }
      const nameOrId = vaultMessage.getNameOrId();
      let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
      if (!vaultId) vaultId = decodeVaultId(nameOrId);
      if (!vaultId) throw new vaultsErrors.ErrorVaultsVaultUndefined();
      // Getting the log
      const depth = vaultsLogMessage.getLogDepth();
      let commitId: string | undefined = vaultsLogMessage.getCommitId();
      commitId = commitId ? commitId : undefined;
      const log = await vaultManager.withVaults([vaultId], async (vault) => {
        return await vault.log(commitId, depth);
      });
      const vaultsLogEntryMessage = new vaultsPB.LogEntry();
      for (const entry of log) {
        vaultsLogEntryMessage.setOid(entry.commitId);
        vaultsLogEntryMessage.setCommitter(entry.committer.name);
        // FIXME: we can make this a google.protobuf.Timestamp field?
        vaultsLogEntryMessage.setTimeStamp(entry.committer.timestamp.getTime());
        vaultsLogEntryMessage.setMessage(entry.message);
        await genWritable.next(vaultsLogEntryMessage);
      }
      await genWritable.next(null);
      return;
    } catch (e) {
      await genWritable.throw(e);
      return;
    }
  };
}

export default vaultsLog;
