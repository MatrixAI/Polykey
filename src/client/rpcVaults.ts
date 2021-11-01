import type { Vault, VaultId, VaultName } from '../vaults/types';
import type { VaultManager } from '../vaults';
import type { FileSystem } from '../types';

import type * as utils from './utils';
import type * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';
import { utils as idUtils } from '@matrixai/id';
import * as grpc from '@grpc/grpc-js';
import * as grpcUtils from '../grpc/utils';
import {
  vaultOps,
  utils as vaultsUtils,
  errors as vaultsErrors,
} from '../vaults';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import * as vaultsPB from '../proto/js/polykey/v1/vaults/vaults_pb';
import * as secretsPB from '../proto/js/polykey/v1/secrets/secrets_pb';

function decodeVaultId(input: string): VaultId | undefined {
  return idUtils.fromMultibase(input)
    ? (idUtils.fromMultibase(input) as VaultId)
    : undefined;
}

const createVaultRPC = ({
  vaultManager,
  authenticate,
  fs,
}: {
  vaultManager: VaultManager;
  authenticate: utils.Authenticate;
  fs: FileSystem;
}) => {
  return {
    vaultsList: async (
      call: grpc.ServerWritableStream<utilsPB.EmptyMessage, vaultsPB.List>,
    ): Promise<void> => {
      // Call.on('error', (e) => console.error(e));
      // call.on('close', () => console.log('Got close'));
      // call.on('finish', () => console.log('Got finish'));
      const genWritable = grpcUtils.generatorWritable(call);
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const vaults = await vaultManager.listVaults();
        for await (const [vaultName, vaultId] of vaults) {
          const vaultListMessage = new vaultsPB.List();
          vaultListMessage.setVaultName(vaultName);
          vaultListMessage.setVaultId(vaultsUtils.makeVaultIdPretty(vaultId));
          await genWritable.next(((_) => vaultListMessage)());
        }
        await genWritable.next(null);
      } catch (err) {
        await genWritable.throw(err);
      }
    },
    vaultsCreate: async (
      call: grpc.ServerUnaryCall<vaultsPB.Vault, utilsPB.StatusMessage>,
      callback: grpc.sendUnaryData<vaultsPB.Vault>,
    ): Promise<void> => {
      const response = new vaultsPB.Vault();
      let vault: Vault;
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        vault = await vaultManager.createVault(
          call.request.getNameOrId() as VaultName,
        );
        response.setNameOrId(vaultsUtils.makeVaultIdPretty(vault.vaultId));
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, response);
    },
    vaultsRename: async (
      call: grpc.ServerUnaryCall<vaultsPB.Rename, vaultsPB.Vault>,
      callback: grpc.sendUnaryData<vaultsPB.Vault>,
    ): Promise<void> => {
      const response = new vaultsPB.Vault();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const vaultMessage = call.request.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const nameOrId = vaultMessage.getNameOrId();
        let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
        if (!vaultId) vaultId = decodeVaultId(nameOrId);
        if (!vaultId) throw new vaultsErrors.ErrorVaultUndefined();
        const newName = call.request.getNewName() as VaultName;
        await vaultManager.renameVault(vaultId, newName);
        response.setNameOrId(vaultsUtils.makeVaultIdPretty(vaultId));
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsDelete: async (
      call: grpc.ServerUnaryCall<vaultsPB.Vault, utilsPB.StatusMessage>,
      callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
    ): Promise<void> => {
      const vaultMessage = call.request;
      const response = new utilsPB.StatusMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const nameOrId = vaultMessage.getNameOrId();
        let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
        if (!vaultId) vaultId = decodeVaultId(nameOrId);
        if (!vaultId) throw new vaultsErrors.ErrorVaultUndefined();
        await vaultManager.destroyVault(vaultId);
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsClone: async (
      call: grpc.ServerUnaryCall<vaultsPB.Clone, utilsPB.StatusMessage>,
      callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
    ): Promise<void> => {
      const response = new utilsPB.StatusMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const vaultMessage = call.request.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const nodeMessage = call.request.getNode();
        if (nodeMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        // Vault id
        // const vaultId = parseVaultInput(vaultMessage, vaultManager);
        // Node id
        // const id = makeNodeId(nodeMessage.getNodeId());

        throw Error('Not implemented');
        // FIXME, not fully implemented
        // await vaultManager.cloneVault(vaultId, id);
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsPull: async (
      call: grpc.ServerUnaryCall<vaultsPB.Pull, utilsPB.StatusMessage>,
      callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
    ): Promise<void> => {
      const response = new utilsPB.StatusMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const vaultMessage = call.request.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const nodeMessage = call.request.getNode();
        if (nodeMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        // Vault name
        // const vaultId = await parseVaultInput(vaultMessage, vaultManager);
        // Node id
        // const id = makeNodeId(nodeMessage.getNodeId());

        // Await vaultManager.pullVault(vaultId, id);
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsScan: async (
      call: grpc.ServerWritableStream<nodesPB.Node, vaultsPB.List>,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      // Const nodeId = makeNodeId(call.request.getNodeId());

      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const vaults = await vaultManager.listVaults();
        vaults.forEach(async (vaultId, vaultName) => {
          const vaultListMessage = new vaultsPB.List();
          vaultListMessage.setVaultName(vaultName);
          vaultListMessage.setVaultId(vaultsUtils.makeVaultIdPretty(vaultId));
          await genWritable.next(vaultListMessage);
        });
        await genWritable.next(null);
      } catch (err) {
        await genWritable.throw(err);
      }
    },
    vaultsSecretsList: async (
      call: grpc.ServerWritableStream<vaultsPB.Vault, secretsPB.Secret>,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);

      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const vaultMessage = call.request;
        const nameOrId = vaultMessage.getNameOrId();
        let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
        if (!vaultId) vaultId = decodeVaultId(nameOrId);
        if (!vaultId) throw new vaultsErrors.ErrorVaultUndefined();
        const vault = await vaultManager.openVault(vaultId);
        const secrets = await vaultOps.listSecrets(vault);
        let secretMessage: secretsPB.Secret;
        for (const secret of secrets) {
          secretMessage = new secretsPB.Secret();
          secretMessage.setSecretName(secret);
          await genWritable.next(secretMessage);
        }
        await genWritable.next(null);
      } catch (err) {
        await genWritable.throw(err);
      }
    },
    vaultsSecretsMkdir: async (
      call: grpc.ServerUnaryCall<vaultsPB.Mkdir, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
    ): Promise<void> => {
      const response = new utilsPB.StatusMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const vaultMkdirMessge = call.request;
        const vaultMessage = vaultMkdirMessge.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const nameOrId = vaultMessage.getNameOrId();
        let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
        if (!vaultId) vaultId = decodeVaultId(nameOrId);
        if (!vaultId) throw new vaultsErrors.ErrorVaultUndefined();
        const vault = await vaultManager.openVault(vaultId);
        await vaultOps.mkdir(vault, vaultMkdirMessge.getDirName(), {
          recursive: vaultMkdirMessge.getRecursive(),
        });
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsSecretsStat: async (
      call: grpc.ServerUnaryCall<vaultsPB.Vault, vaultsPB.Stat>,
      callback: grpc.sendUnaryData<vaultsPB.Stat>,
    ): Promise<void> => {
      const response = new vaultsPB.Stat();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        // Const vaultMessage = call.request;
        // Const id = await parseVaultInput(vaultMessage, vaultManager);
        // const vault = await vaultManager.openVault(id);
        // FIXME, reimplement this.
        throw Error('Not Implemented');
        // Const stats = await vaultManager.vaultStats(id);
        // response.setStats(JSON.stringify(stats)););
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsSecretsDelete: async (
      call: grpc.ServerUnaryCall<secretsPB.Secret, utilsPB.StatusMessage>,
      callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
    ): Promise<void> => {
      const response = new utilsPB.StatusMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const vaultMessage = call.request.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const nameOrId = vaultMessage.getNameOrId();
        let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
        if (!vaultId) vaultId = decodeVaultId(nameOrId);
        if (!vaultId) throw new vaultsErrors.ErrorVaultUndefined();
        const vault = await vaultManager.openVault(vaultId);
        const secretName = call.request.getSecretName();
        await vaultOps.deleteSecret(vault, secretName);
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsSecretsEdit: async (
      call: grpc.ServerUnaryCall<secretsPB.Secret, utilsPB.StatusMessage>,
      callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
    ): Promise<void> => {
      const response = new utilsPB.StatusMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const secretMessage = call.request;
        if (secretMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const vaultMessage = secretMessage.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const nameOrId = vaultMessage.getNameOrId();
        let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
        if (!vaultId) vaultId = decodeVaultId(nameOrId);
        if (!vaultId) throw new vaultsErrors.ErrorVaultUndefined();
        const vault = await vaultManager.openVault(vaultId);
        const secretName = secretMessage.getSecretName();
        const secretContent = Buffer.from(secretMessage.getSecretContent());
        await vaultOps.updateSecret(vault, secretName, secretContent);
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsSecretsGet: async (
      call: grpc.ServerUnaryCall<secretsPB.Secret, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<secretsPB.Secret>,
    ): Promise<void> => {
      const response = new secretsPB.Secret();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const vaultMessage = call.request.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const nameOrId = vaultMessage.getNameOrId();
        let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
        if (!vaultId) vaultId = decodeVaultId(nameOrId);
        if (!vaultId) throw new vaultsErrors.ErrorVaultUndefined();
        const vault = await vaultManager.openVault(vaultId);
        const secretName = call.request.getSecretName();
        const secretContent = await vaultOps.getSecret(vault, secretName);

        response.setSecretContent(secretContent);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsSecretsRename: async (
      call: grpc.ServerUnaryCall<secretsPB.Rename, utilsPB.StatusMessage>,
      callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
    ): Promise<void> => {
      const response = new utilsPB.StatusMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const secretMessage = call.request.getOldSecret();
        if (!secretMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const vaultMessage = secretMessage.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const nameOrId = vaultMessage.getNameOrId();
        let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
        if (!vaultId) vaultId = decodeVaultId(nameOrId);
        if (!vaultId) throw new vaultsErrors.ErrorVaultUndefined();
        const vault = await vaultManager.openVault(vaultId);
        const oldSecret = secretMessage.getSecretName();
        const newSecret = call.request.getNewName();
        await vaultOps.renameSecret(vault, oldSecret, newSecret);
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsSecretsNew: async (
      call: grpc.ServerUnaryCall<secretsPB.Secret, utilsPB.StatusMessage>,
      callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
    ): Promise<void> => {
      const response = new utilsPB.StatusMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const vaultMessage = call.request.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const nameOrId = vaultMessage.getNameOrId();
        let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
        if (!vaultId) vaultId = decodeVaultId(nameOrId);
        if (!vaultId) throw new vaultsErrors.ErrorVaultUndefined();
        const vault = await vaultManager.openVault(vaultId);
        const secret = call.request.getSecretName();
        const content = Buffer.from(call.request.getSecretContent());
        await vaultOps.addSecret(vault, secret, content);
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsSecretsNewDir: async (
      call: grpc.ServerUnaryCall<secretsPB.Directory, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
    ): Promise<void> => {
      const response = new utilsPB.StatusMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const vaultMessage = call.request.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const nameOrId = vaultMessage.getNameOrId();
        let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
        if (!vaultId) vaultId = decodeVaultId(nameOrId);
        if (!vaultId) throw new vaultsErrors.ErrorVaultUndefined();
        const vault = await vaultManager.openVault(vaultId);
        const secretsPath = call.request.getSecretDirectory();
        await vaultOps.addSecretDirectory(vault, secretsPath, fs);
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsPermissionsSet: async (
      call: grpc.ServerUnaryCall<vaultsPB.PermSet, utilsPB.StatusMessage>,
      callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
    ): Promise<void> => {
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const nodeMessage = call.request.getNode();
        if (nodeMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        // Const node = makeNodeId(nodeMessage.getNodeId());
        const vaultMessage = call.request.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        // Const id = await parseVaultInput(vaultMessage, vaultManager);
        throw Error('Not Implemented');
        // Await vaultManager.setVaultPermissions(node, id); // FIXME
        const response = new utilsPB.StatusMessage();
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsPermissionsUnset: async (
      call: grpc.ServerUnaryCall<vaultsPB.PermUnset, utilsPB.StatusMessage>,
      callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
    ): Promise<void> => {
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const nodeMessage = call.request.getNode();
        if (nodeMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        // Const node = makeNodeId(nodeMessage.getNodeId());
        const vaultMessage = call.request.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        // Const id = await parseVaultInput(vaultMessage, vaultManager);
        throw Error('Not implemented');
        // Await vaultManager.unsetVaultPermissions(node, id); // FIXME
        const response = new utilsPB.StatusMessage();
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsPermissions: async (
      call: grpc.ServerWritableStream<vaultsPB.PermGet, vaultsPB.Permission>,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);

      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const nodeMessage = call.request.getNode();
        if (nodeMessage == null) {
          await genWritable.throw({ code: grpc.status.NOT_FOUND });
          return;
        }
        // Const node = nodeMessage.getNodeId();
        const vaultMessage = call.request.getVault();
        if (vaultMessage == null) {
          await genWritable.throw({ code: grpc.status.NOT_FOUND });
          return;
        }
        // Const id = await parseVaultInput(vaultMessage, vaultManager);
        // let perms: Record<NodeId, VaultAction>;
        throw Error('Not implemented');
        // FIXME
        // if (isNodeId(node)) {
        // Perms = await vaultManager.getVaultPermissions(id, node);
        // } else {
        // Perms = await vaultManager.getVaultPermissions(id);
        // }
        // const permissionMessage = new vaultsPB.Permission();
        // For (const nodeId in perms) {
        //   permissionMessage.setNodeId(nodeId);
        //   if (perms[nodeId]['pull'] !== undefined) {
        //     permissionMessage.setAction('pull');
        //   }
        //   await genWritable.next(permissionMessage);
        // }
        await genWritable.next(null);
      } catch (err) {
        await genWritable.throw(err);
      }
    },
    vaultsVersion: async (
      call: grpc.ServerUnaryCall<vaultsPB.Version, vaultsPB.VersionResult>,
      callback: grpc.sendUnaryData<vaultsPB.VersionResult>,
    ): Promise<void> => {
      try {
        // Checking session token
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const vaultsVersionMessage = call.request;

        // Getting vault ID
        const vaultMessage = vaultsVersionMessage.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const nameOrId = vaultMessage.getNameOrId();
        let vaultId = await vaultManager.getVaultId(nameOrId as VaultName);
        if (!vaultId) vaultId = decodeVaultId(nameOrId);
        if (!vaultId) throw new vaultsErrors.ErrorVaultUndefined();

        // Doing the deed
        const vault = await vaultManager.openVault(vaultId);
        const latestOid = (await vault.log())[0].oid;
        const versionId = vaultsVersionMessage.getVersionId();

        await vault.version(versionId);
        const currentVersionId = (await vault.log(0, versionId))[0]?.oid;

        // Checking if latest version ID.
        const isLatestVersion = latestOid === currentVersionId;

        // Creating message
        const vaultsVersionResultMessage = new vaultsPB.VersionResult();
        vaultsVersionResultMessage.setIsLatestVersion(isLatestVersion);

        // Sending message
        callback(null, vaultsVersionResultMessage);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsLog: async (
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
        if (!vaultId) throw new vaultsErrors.ErrorVaultUndefined();
        const vault = await vaultManager.openVault(vaultId);

        // Getting the log
        const depth = vaultsLogMessage.getLogDepth();
        let commitId: string | undefined = vaultsLogMessage.getCommitId();
        commitId = commitId ? commitId : undefined;
        const log = await vault.log(depth, commitId);

        const vaultsLogEntryMessage = new vaultsPB.LogEntry();
        for (const entry of log) {
          vaultsLogEntryMessage.setOid(entry.oid);
          vaultsLogEntryMessage.setCommitter(entry.committer);
          vaultsLogEntryMessage.setTimeStamp(entry.timeStamp);
          vaultsLogEntryMessage.setMessage(entry.message);
          await genWritable.next(vaultsLogEntryMessage);
        }
        await genWritable.next(null);
      } catch (err) {
        await genWritable.throw(err);
      }
    },
  };
};

export default createVaultRPC;
