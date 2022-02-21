import type { Authenticate } from '../types';
import type { VaultName } from '../../vaults/types';
import type { VaultManager } from '../../vaults';
import * as grpc from '@grpc/grpc-js';
import { utils as grpcUtils } from '../../grpc';
import * as vaultsPB from '../../proto/js/polykey/v1/vaults/vaults_pb';
import * as validationUtils from '../../validation/utils';

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
      vaultId = vaultId ?? validationUtils.parseVaultId(nameOrId);
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
