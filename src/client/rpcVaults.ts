import type { NodeId } from '../nodes/types';
import type { Vault, VaultAction, VaultName } from '../vaults/types';
import type { SessionManager } from '../sessions';
import type { VaultManager } from '../vaults';

import * as utils from './utils';
import * as grpc from '@grpc/grpc-js';
import * as grpcUtils from '../grpc/utils';
import * as clientPB from '../proto/js/Client_pb';
import { isNodeId, makeNodeId } from '../nodes/utils';
import { vaultOps } from '../vaults';
import { makeVaultIdPretty } from '../vaults/utils';
import { parseVaultInput } from './utils';

const createVaultRPC = ({
  vaultManager,
  sessionManager,
}: {
  vaultManager: VaultManager;
  sessionManager: SessionManager;
}) => {
  return {
    vaultsList: async (
      call: grpc.ServerWritableStream<
        clientPB.EmptyMessage,
        clientPB.VaultListMessage
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const vaults = await vaultManager.listVaults();
        for await (const [vaultName, vaultId] of vaults) {
          const vaultListMessage = new clientPB.VaultListMessage();
          vaultListMessage.setVaultName(vaultName);
          vaultListMessage.setVaultId(makeVaultIdPretty(vaultId));
          await genWritable.next(vaultListMessage);
        }
        await genWritable.next(null);
      } catch (err) {
        await genWritable.throw(err);
      }
    },
    vaultsCreate: async (
      call: grpc.ServerUnaryCall<clientPB.VaultMessage, clientPB.StatusMessage>,
      callback: grpc.sendUnaryData<clientPB.VaultMessage>,
    ): Promise<void> => {
      const response = new clientPB.VaultMessage();
      let vault: Vault;
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        vault = await vaultManager.createVault(
          call.request.getNameOrId() as VaultName,
        );
        response.setNameOrId(makeVaultIdPretty(vault.vaultId));
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, response);
    },
    vaultsRename: async (
      call: grpc.ServerUnaryCall<
        clientPB.VaultRenameMessage,
        clientPB.VaultMessage
      >,
      callback: grpc.sendUnaryData<clientPB.VaultMessage>,
    ): Promise<void> => {
      const response = new clientPB.VaultMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const vaultMessage = call.request.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const id = await utils.parseVaultInput(vaultMessage, vaultManager);
        const newName = call.request.getNewName() as VaultName;
        await vaultManager.renameVault(id, newName);
        response.setNameOrId(makeVaultIdPretty(id));
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsDelete: async (
      call: grpc.ServerUnaryCall<clientPB.VaultMessage, clientPB.StatusMessage>,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const vaultMessage = call.request;
      const response = new clientPB.StatusMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const id = await utils.parseVaultInput(vaultMessage, vaultManager);
        await vaultManager.destroyVault(id!);
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsClone: async (
      call: grpc.ServerUnaryCall<
        clientPB.VaultCloneMessage,
        clientPB.StatusMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
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
        const vaultId = parseVaultInput(vaultMessage, vaultManager);
        // Node id
        const id = makeNodeId(nodeMessage.getNodeId());

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
      call: grpc.ServerUnaryCall<
        clientPB.VaultPullMessage,
        clientPB.StatusMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
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
        const vaultId = await utils.parseVaultInput(vaultMessage, vaultManager);
        // Node id
        const id = makeNodeId(nodeMessage.getNodeId());

        // Await vaultManager.pullVault(vaultId, id);
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsScan: async (
      call: grpc.ServerWritableStream<
        clientPB.NodeMessage,
        clientPB.VaultListMessage
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      const nodeId = makeNodeId(call.request.getNodeId());

      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const vaults = await vaultManager.listVaults();
        vaults.forEach(async (vaultId, vaultName) => {
          const vaultListMessage = new clientPB.VaultListMessage();
          vaultListMessage.setVaultName(vaultName);
          vaultListMessage.setVaultId(makeVaultIdPretty(vaultId));
          await genWritable.next(vaultListMessage);
        });
        await genWritable.next(null);
      } catch (err) {
        await genWritable.throw(err);
      }
    },
    vaultsSecretsList: async (
      call: grpc.ServerWritableStream<
        clientPB.VaultMessage,
        clientPB.SecretMessage
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);

      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const vaultMessage = call.request;
        const id = await utils.parseVaultInput(vaultMessage, vaultManager);
        const vault = await vaultManager.openVault(id);
        const secrets = await vaultOps.listSecrets(vault);
        let secretMessage: clientPB.SecretMessage;
        for (const secret of secrets) {
          secretMessage = new clientPB.SecretMessage();
          secretMessage.setSecretName(secret);
          await genWritable.next(secretMessage);
        }
        await genWritable.next(null);
      } catch (err) {
        await genWritable.throw(err);
      }
    },
    vaultsSecretsMkdir: async (
      call: grpc.ServerUnaryCall<
        clientPB.VaultMkdirMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);

        const vaultMkdirMessge = call.request;
        const vaultMessage = vaultMkdirMessge.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const id = await utils.parseVaultInput(vaultMessage, vaultManager);
        const vault = await vaultManager.openVault(id);
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
      call: grpc.ServerUnaryCall<clientPB.VaultMessage, clientPB.StatMessage>,
      callback: grpc.sendUnaryData<clientPB.StatMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const vaultMessage = call.request;
        const id = await utils.parseVaultInput(vaultMessage, vaultManager);
        const vault = await vaultManager.openVault(id);
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
      call: grpc.ServerUnaryCall<
        clientPB.SecretMessage,
        clientPB.StatusMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const vaultMessage = call.request.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const id = await utils.parseVaultInput(vaultMessage, vaultManager);
        const vault = await vaultManager.openVault(id);
        const secretName = call.request.getSecretName();
        await vaultOps.deleteSecret(vault, secretName);
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsSecretsEdit: async (
      call: grpc.ServerUnaryCall<
        clientPB.SecretMessage,
        clientPB.StatusMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
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
        const id = await utils.parseVaultInput(vaultMessage, vaultManager);
        const vault = await vaultManager.openVault(id);
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
      call: grpc.ServerUnaryCall<clientPB.SecretMessage, clientPB.EmptyMessage>,
      callback: grpc.sendUnaryData<clientPB.SecretMessage>,
    ): Promise<void> => {
      const response = new clientPB.SecretMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const vaultMessage = call.request.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const id = await utils.parseVaultInput(vaultMessage, vaultManager);
        const vault = await vaultManager.openVault(id);
        const secretName = call.request.getSecretName();
        const secretContent = await vaultOps.getSecret(vault, secretName);

        response.setSecretContent(secretContent);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsSecretsRename: async (
      call: grpc.ServerUnaryCall<
        clientPB.SecretRenameMessage,
        clientPB.StatusMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
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
        const id = await utils.parseVaultInput(vaultMessage, vaultManager);
        const vault = await vaultManager.openVault(id);
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
      call: grpc.ServerUnaryCall<
        clientPB.SecretMessage,
        clientPB.StatusMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const vaultMessage = call.request.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const id = await utils.parseVaultInput(vaultMessage, vaultManager);
        const vault = await vaultManager.openVault(id);
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
      call: grpc.ServerUnaryCall<
        clientPB.SecretDirectoryMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const vaultMessage = call.request.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const id = await utils.parseVaultInput(vaultMessage, vaultManager);
        const vault = await vaultManager.openVault(id);
        const secretsPath = call.request.getSecretDirectory();
        await vaultOps.addSecretDirectory(vault, secretsPath);
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsPermissionsSet: async (
      call: grpc.ServerUnaryCall<
        clientPB.SetVaultPermMessage,
        clientPB.StatusMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const nodeMessage = call.request.getNode();
        if (nodeMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const node = makeNodeId(nodeMessage.getNodeId());
        const vaultMessage = call.request.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const id = await utils.parseVaultInput(vaultMessage, vaultManager);
        throw Error('Not Implemented');
        // Await vaultManager.setVaultPermissions(node, id); // FIXME
        const response = new clientPB.StatusMessage();
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsPermissionsUnset: async (
      call: grpc.ServerUnaryCall<
        clientPB.UnsetVaultPermMessage,
        clientPB.StatusMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const nodeMessage = call.request.getNode();
        if (nodeMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const node = makeNodeId(nodeMessage.getNodeId());
        const vaultMessage = call.request.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const id = await utils.parseVaultInput(vaultMessage, vaultManager);
        throw Error('Not implemented');
        // Await vaultManager.unsetVaultPermissions(node, id); // FIXME
        const response = new clientPB.StatusMessage();
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsPermissions: async (
      call: grpc.ServerWritableStream<
        clientPB.GetVaultPermMessage,
        clientPB.PermissionMessage
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);

      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const nodeMessage = call.request.getNode();
        if (nodeMessage == null) {
          await genWritable.throw({ code: grpc.status.NOT_FOUND });
          return;
        }
        const node = nodeMessage.getNodeId();
        const vaultMessage = call.request.getVault();
        if (vaultMessage == null) {
          await genWritable.throw({ code: grpc.status.NOT_FOUND });
          return;
        }
        const id = await utils.parseVaultInput(vaultMessage, vaultManager);
        let perms: Record<NodeId, VaultAction>;
        throw Error('Not implemented');
        // FIXME
        if (isNodeId(node)) {
          // Perms = await vaultManager.getVaultPermissions(id, node);
        } else {
          // Perms = await vaultManager.getVaultPermissions(id);
        }
        const permissionMessage = new clientPB.PermissionMessage();
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
      call: grpc.ServerUnaryCall<
        clientPB.VaultsVersionMessage,
        clientPB.VaultsVersionResultMessage
      >,
      callback: grpc.sendUnaryData<clientPB.VaultsVersionResultMessage>,
    ): Promise<void> => {
      try {
        //Checking session token
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);

        const vaultsVersionMessage = call.request;

        //Getting vault ID
        const vaultMessage = vaultsVersionMessage.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const vaultId = await utils.parseVaultInput(vaultMessage, vaultManager);

        // Doing the deed
        const vault = await vaultManager.openVault(vaultId);
        const latestOid = (await vault.log())[0].oid;
        const versionId = vaultsVersionMessage.getVersionId();

        await vault.version(versionId);
        const currentVersionId = (await vault.log(0, versionId))[0]?.oid;

        // Checking if latest version ID.
        console.log(latestOid, currentVersionId);
        const isLatestVersion = latestOid === currentVersionId;

        // Creating message
        const vaultsVersionResultMessage =
          new clientPB.VaultsVersionResultMessage();
        vaultsVersionResultMessage.setIsLatestVersion(isLatestVersion);

        // Sending message
        callback(null, vaultsVersionResultMessage);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsLog: async (
      call: grpc.ServerWritableStream<
        clientPB.VaultsLogMessage,
        clientPB.VaultsLogEntryMessage
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);

        //Getting the vault.
        const vaultsLogMessage = call.request;
        const vaultMessage = vaultsLogMessage.getVault();
        if (vaultMessage == null) {
          await genWritable.throw({ code: grpc.status.NOT_FOUND });
          return;
        }
        const vaultId = await utils.parseVaultInput(vaultMessage, vaultManager);
        const vault = await vaultManager.openVault(vaultId);

        // Getting the log
        const depth = vaultsLogMessage.getLogDepth();
        let commitId: string | undefined = vaultsLogMessage.getCommitId();
        commitId = commitId ? commitId : undefined;
        const log = await vault.log(depth, commitId);

        const vaultsLogEntryMessage = new clientPB.VaultsLogEntryMessage();
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
