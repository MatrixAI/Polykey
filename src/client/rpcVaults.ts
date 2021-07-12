import type { VaultAction } from '../vaults/types';
import type { NodeId } from '../nodes/types';

import * as grpc from '@grpc/grpc-js';
import * as grpcUtils from '../grpc/utils';
import * as clientPB from '../proto/js/Client_pb';
import { VaultManager, Vault } from '../vaults';
import { SessionManager } from '../session';
import * as errors from './../vaults/errors';
import * as utils from './utils';

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
        await utils.verifyToken(call.metadata, sessionManager);
        const vaults: Array<{
          name: string;
          id: string;
        }> = await vaultManager.listVaults();
        let vaultListMessage: clientPB.VaultListMessage;
        for (const vault of vaults) {
          vaultListMessage = new clientPB.VaultListMessage();
          vaultListMessage.setName(vault.name);
          vaultListMessage.setId(vault.id);
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
        await utils.verifyToken(call.metadata, sessionManager);
        vault = await vaultManager.createVault(call.request.getName());
        response.setId(vault.vaultId);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, response);
    },
    vaultsRename: async (
      call: grpc.ServerUnaryCall<
        clientPB.VaultRenameMessage,
        clientPB.StatusMessage
      >,
      callback: grpc.sendUnaryData<clientPB.VaultMessage>,
    ): Promise<void> => {
      const response = new clientPB.VaultMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const vaultMessage = call.request.getVault();
        if (!vaultMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const name = vaultMessage.getName();
        const id = await utils.parseVaultInput(name, vaultManager);
        const newName = call.request.getNewname();
        await vaultManager.renameVault(id, newName);
        response.setId(id);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsDelete: async (
      call: grpc.ServerUnaryCall<clientPB.VaultMessage, clientPB.StatusMessage>,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const name = call.request.getName();
        const id = await await utils.parseVaultInput(name, vaultManager);
        const result = await vaultManager.deleteVault(id);
        response.setSuccess(result);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsPull: async (
      call: grpc.ServerUnaryCall<
        clientPB.VaultPullMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const vaultMessage = call.request.getVault();
        if (!vaultMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const nodeMessage = call.request.getNode();
        if (!nodeMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        // vault name
        const name = vaultMessage.getName();
        // node id
        const id = nodeMessage.getName();
        // const vaultsList = await gitManager.scanNodeVaults(id);
        // let vault, vaultId;
        // for (const vaults in vaultsList) {
        //   vault = vaultsList[vaults].split('\t');
        //   if (vault[1] === name) {
        //     vaultId = vault[0];
        //   }
        // }
        // try {
        //   await vaultManager.pullVault(vaultId, id);
        // } catch (err) {
        //   if (err instanceof errors.ErrorVaultUnlinked) {
        //     await vaultManager.cloneVault(vaultId, id);
        //   }
        // }
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsScan: async (
      call: grpc.ServerWritableStream<
        clientPB.NodeMessage,
        clientPB.VaultMessage
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      const nodeId = call.request.getName();

      try {
        await utils.verifyToken(call.metadata, sessionManager);
        // const vaults: Array<string> = await gitManager.scanNodeVaults(nodeId);
        // let vaultMessage: clientPB.VaultMessage;
        // for (const vault of vaults) {
        //   vaultMessage = new clientPB.VaultMessage();
        //   vaultMessage.setName(vault);
        //   await genWritable.next(vaultMessage);
        // }
        await genWritable.next(null);
      } catch (err) {
        await genWritable.throw(err);
      }
    },
    vaultsListSecrets: async (
      call: grpc.ServerWritableStream<
        clientPB.VaultMessage,
        clientPB.SecretMessage
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);

      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const name = call.request.getName();
        const id = await await utils.parseVaultInput(name, vaultManager);
        const vault = await vaultManager.getVault(id);
        const secrets: Array<string> = await vault.listSecrets();
        let secretMessage: clientPB.SecretMessage;
        for (const secret of secrets) {
          secretMessage = new clientPB.SecretMessage();
          secretMessage.setName(secret);
          await genWritable.next(secretMessage);
        }
        await genWritable.next(null);
      } catch (err) {
        await genWritable.throw(err);
      }
    },
    vaultsMkdir: async (
      call: grpc.ServerUnaryCall<
        clientPB.VaultMkdirMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const vaultMessage = call.request.getVault();
        if (!vaultMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const name = vaultMessage.getName();
        const id = await utils.parseVaultInput(name, vaultManager);
        const vault = await vaultManager.getVault(id);
        const success = await vault.mkdir(call.request.getDirname(), {
          recursive: true,
        });
        response.setSuccess(success);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsStat: async (
      call: grpc.ServerUnaryCall<clientPB.VaultMessage, clientPB.StatMessage>,
      callback: grpc.sendUnaryData<clientPB.StatMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const name = call.request.getName();
        const id = await utils.parseVaultInput(name, vaultManager);
        const stats = await vaultManager.vaultStats(id);
        response.setStats(JSON.stringify(stats));
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsDeleteSecret: async (
      call: grpc.ServerUnaryCall<
        clientPB.SecretMessage,
        clientPB.StatusMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const vaultMessage = call.request.getVault();
        if (!vaultMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const name = vaultMessage.getName();
        const id = await utils.parseVaultInput(name, vaultManager);
        const vault = await vaultManager.getVault(id);
        const success = await vault.deleteSecret(call.request.getName(), {
          recursive: true,
        });
        response.setSuccess(success);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsEditSecret: async (
      call: grpc.ServerUnaryCall<
        clientPB.SecretEditMessage,
        clientPB.StatusMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const secretMessage = call.request.getSecret();
        if (!secretMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const vaultMessage = secretMessage.getVault();
        if (!vaultMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const name = vaultMessage.getName();
        const id = await utils.parseVaultInput(name, vaultManager);
        const vault = await vaultManager.getVault(id);
        const secret = secretMessage.getName();
        const content = secretMessage.getContent();
        await vault.updateSecret(secret, content);
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsGetSecret: async (
      call: grpc.ServerUnaryCall<clientPB.SecretMessage, clientPB.EmptyMessage>,
      callback: grpc.sendUnaryData<clientPB.SecretMessage>,
    ): Promise<void> => {
      const response = new clientPB.SecretMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const vaultMessage = call.request.getVault();
        if (!vaultMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const name = vaultMessage.getName();
        const id = await utils.parseVaultInput(name, vaultManager);
        const vault = await vaultManager.getVault(id);

        const secret = await vault.getSecret(call.request.getName());
        response.setContent(secret);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsRenameSecret: async (
      call: grpc.ServerUnaryCall<
        clientPB.SecretRenameMessage,
        clientPB.StatusMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const secretMessage = call.request.getOldsecret();
        if (!secretMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const vaultMessage = secretMessage.getVault();
        if (!vaultMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const name = vaultMessage.getName();
        const id = await utils.parseVaultInput(name, vaultManager);
        const vault = await vaultManager.getVault(id);
        const oldSecret = secretMessage.getName();
        const newSecret = call.request.getNewname();
        const success = await vault.renameSecret(oldSecret, newSecret);
        response.setSuccess(success);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsNewSecret: async (
      call: grpc.ServerUnaryCall<
        clientPB.SecretMessage,
        clientPB.StatusMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const vaultMessage = call.request.getVault();
        if (!vaultMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const name = vaultMessage.getName();
        const id = await utils.parseVaultInput(name, vaultManager);
        const vault = await vaultManager.getVault(id);
        const secret = call.request.getName();
        const content = call.request.getContent();
        const success = await vault.addSecret(secret, content);
        response.setSuccess(success);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsNewDirSecret: async (
      call: grpc.ServerUnaryCall<
        clientPB.SecretDirectoryMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const vaultMessage = call.request.getVault();
        if (!vaultMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const name = vaultMessage.getName();
        const id = await utils.parseVaultInput(name, vaultManager);
        const vault = await vaultManager.getVault(id);
        const secretsPath = call.request.getSecretdirectory();

        await vault.addSecretDirectory(secretsPath);
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsSetPerms: async (
      call: grpc.ServerUnaryCall<
        clientPB.SetVaultPermMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const nodeMessage = call.request.getNode();
        if (!nodeMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const node = nodeMessage.getName();
        const vaultMessage = call.request.getVault();
        if (!vaultMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const vault = vaultMessage.getName();
        const id = await utils.parseVaultInput(vault, vaultManager);
        await vaultManager.setVaultPermissions(node, id);
        const response = new clientPB.StatusMessage();
        response.setSuccess(true);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsUnsetPerms: async (
      call: grpc.ServerUnaryCall<
        clientPB.UnsetVaultPermMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const nodeMessage = call.request.getNode();
        if (!nodeMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const node = nodeMessage.getName();
        const vaultMessage = call.request.getVault();
        if (!vaultMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const vault = vaultMessage.getName();
        const id = await utils.parseVaultInput(vault, vaultManager);
        await vaultManager.unsetVaultPermissions(node, id);
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
        await utils.verifyToken(call.metadata, sessionManager);
        const nodeMessage = call.request.getNode();
        if (!nodeMessage) {
          await genWritable.throw({ code: grpc.status.NOT_FOUND });
          return;
        }
        const node = nodeMessage.getName();
        const vaultMessage = call.request.getVault();
        if (!vaultMessage) {
          await genWritable.throw({ code: grpc.status.NOT_FOUND });
          return;
        }
        const vault = vaultMessage.getName();
        const id = await utils.parseVaultInput(vault, vaultManager);
        let perms: Record<NodeId, VaultAction>;
        if (node) {
          perms = await vaultManager.getVaultPermissions(id, node);
        } else {
          perms = await vaultManager.getVaultPermissions(id);
        }
        const permissionMessage = new clientPB.PermissionMessage();
        for (const nodeId in perms) {
          permissionMessage.setId(nodeId);
          if (perms[nodeId]['pull'] !== undefined) {
            permissionMessage.setAction('pull');
          }
          await genWritable.next(permissionMessage);
        }
        await genWritable.next(null);
      } catch (err) {
        await genWritable.throw(err);
      }
    },
  };
};

export default createVaultRPC;
