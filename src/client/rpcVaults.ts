import type { NodeId } from "../nodes/types";
import type { VaultAction, VaultId, VaultName } from "../vaults/types";
import type { SessionManager } from "../sessions";
import type { VaultInternal, VaultManager } from "../vaults";

import * as utils from "./utils";
import * as grpc from "@grpc/grpc-js";
import * as grpcUtils from "../grpc/utils";
import * as clientPB from "../proto/js/Client_pb";
import { VaultMessage } from "../proto/js/Client_pb";
import { isNodeId, makeNodeId } from "../nodes/utils";
import NameOrIdCase = VaultMessage.NameOrIdCase;
import { makeVaultId } from "../vaults/utils";
import * as clientErrors from './errors';

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
        let vaultListMessage: clientPB.VaultListMessage;
        vaults.forEach(async (vaultId, vaultName) => {
          vaultListMessage = new clientPB.VaultListMessage();
          vaultListMessage.setVaultName(vaultName);
          vaultListMessage.setVaultId(vaultId);
          await genWritable.next(vaultListMessage);
        });
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
      let vault;
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        vault = await vaultManager.createVault(call.request.getVaultName() as VaultName);
        response.setVaultId(vault.vaultId);
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
        response.setVaultId(id);
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
        await vaultManager.destroyVault(id);
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
        const vaultId = vaultMessage.getVaultId() as VaultId;
        // Node id
        const id = makeNodeId(nodeMessage.getNodeId());

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

        // await vaultManager.pullVault(vaultId, id);
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
        const vaults = await vaultManager.listVaults(nodeId);
        vaults.forEach(async (vaultId, vaultName) => {
          const vaultListMessage = new clientPB.VaultListMessage();
          vaultListMessage.setVaultName(vaultName);
          vaultListMessage.setVaultId(vaultId);
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
        const id = await await utils.parseVaultInput(
          vaultMessage,
          vaultManager,
        );
        const vault = await vaultManager.openVault(id);
        const secrets: Array<string> = await vault.access(async (efs) => {
          const list = await efs.readdir('.', { encoding: 'utf8' }) as string[];
          return list.filter((value) => { if (value !== '.git') return value });
        });
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
        const vaultMessage = call.request.getVault();
        if (vaultMessage == null) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const id = await utils.parseVaultInput(vaultMessage, vaultManager);
        const vault = await vaultManager.openVault(id);
        await vault.commit(async (efs) => {
          await efs.mkdir(call.request.getDirName(), { recursive: true });
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
        // response.setStats(JSON.stringify(stats));
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
        await vault.commit(async (efs) => {
          await efs.unlink(call.request.getSecretName());
        });
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsSecretsEdit: async (
      call: grpc.ServerUnaryCall<
        clientPB.SecretEditMessage,
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
        const secretMessage = call.request.getSecret();
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
        const secret = secretMessage.getSecretName();
        const content = secretMessage.getSecretContent();
        await vault.commit(async (efs) => {
          await efs.writeFile(secret, content);
        });
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

        const secret = await vault.access(async (efs) => {
          return await efs.readFile(call.request.getSecretName(), { encoding: 'utf8' }) as string;
        });
        response.setSecretContent(secret);
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
        await vault.commit(async (efs) => {
          await efs.rename(oldSecret, newSecret);
        });
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
        const content = call.request.getSecretContent();
        await vault.commit(async (efs) => {
          await efs.writeFile(secret, content);
        });
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

        // await vault.addSecretDirectory(secretsPath);
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
        // await vaultManager.setVaultPermissions(node, id); // FIXME
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
        // await vaultManager.unsetVaultPermissions(node, id);
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
        if (isNodeId(node)) {
          // perms = await vaultManager.getVaultPermissions(id, node);
        } else {
          // perms = await vaultManager.getVaultPermissions(id);
        }
        const permissionMessage = new clientPB.PermissionMessage();
        // for (const nodeId in perms) {
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
      call: grpc.ServerUnaryCall<clientPB.VaultsVersionMessage, clientPB.VaultsVersionResultMessage>,
      callback: grpc.sendUnaryData<clientPB.VaultsVersionResultMessage>,
    ): Promise<void> => {
      try {
        //checking session token
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);

        const vaultsVersionMessage = call.request;

        //getting vault ID
        const vaultMessage = vaultsVersionMessage.getVault();
        let vaultId: VaultId;
        switch(vaultMessage?.getNameOrIdCase()) {
          case NameOrIdCase.VAULT_NAME:
            vaultId = (await vaultManager.getVaultId(vaultMessage?.getVaultName() as VaultName))!
            break;
          case NameOrIdCase.VAULT_ID:
            vaultId = makeVaultId(vaultMessage?.getVaultId());
            break;
          case NameOrIdCase.NAME_OR_ID_NOT_SET:
          default:
            // Here be dragons
            throw new clientErrors.ErrorClient('Vault name or ID was not provided');
        }

        // Doing the deed

        const vault = await vaultManager.openVault(vaultId);
        const latestOid = (await vault.log())[0].oid;
        let versionId = vaultsVersionMessage.getVersionId();
        switch(versionId.toLowerCase()) {
          case 'end': // We can expand this for more tags
          {
            // Check the latest commit.
            versionId = latestOid;
          }
            break;
        }
        await vault.version(versionId);

        // checking if latest version ID.
        const isLatestVersion = latestOid === versionId;

        // Creating message
        const vaultsVersionResultMessage = new clientPB.VaultsVersionResultMessage();
        vaultsVersionResultMessage.setIsLatestVersion(isLatestVersion);

        // Sending message
        callback(null, vaultsVersionResultMessage);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
  };
};

export default createVaultRPC;
