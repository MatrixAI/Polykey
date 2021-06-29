import type { VaultAction } from '../vaults/types';
import type { NodeId } from '../nodes/types';

import * as grpc from '@grpc/grpc-js';
import * as grpcUtils from '../grpc/utils';
import * as clientPB from '../proto/js/Client_pb';
import { VaultManager, Vault } from '../vaults';
import { SessionManager } from '../session';
import * as errors from './../vaults/errors';
import { GitManager } from '../git';
import * as utils from './utils';

const createVaultRPC = ({
  vaultManager,
  gitManager,
  sessionManager,
}: {
  vaultManager: VaultManager;
  gitManager: GitManager;
  sessionManager: SessionManager;
}) => {
  return {
    vaultsList: async (
      call: grpc.ServerWritableStream<
        clientPB.EmptyMessage,
        clientPB.VaultMessage
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);

      try {
        await utils.checkPassword(call.metadata, sessionManager);
        const vaults: Array<{
          name: string;
          id: string;
        }> = vaultManager.listVaults();
        let vaultMessage: clientPB.VaultMessage;
        for (const vault of vaults) {
          vaultMessage = new clientPB.VaultMessage();
          vaultMessage.setName(vault.name);
          vaultMessage.setId(vault.id);
          await genWritable.next(vaultMessage);
        }
        await genWritable.next(null);
      } catch (err) {
        await genWritable.throw(err);
      }
    },
    vaultsCreate: async (
      call: grpc.ServerUnaryCall<clientPB.VaultMessage, clientPB.StatusMessage>,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      let vault: Vault;
      try {
        await utils.checkPassword(call.metadata, sessionManager);
        vault = await vaultManager.createVault(call.request.getName());
        await vault.initializeVault();
        response.setSuccess(true);
      } catch (err) {
        response.setSuccess(false);
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    vaultsRename: async (
      call: grpc.ServerUnaryCall<clientPB.VaultMessage, clientPB.StatusMessage>,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await utils.checkPassword(call.metadata, sessionManager);
        const name = call.request.getId();
        const id = utils.parseVaultInput(name, vaultManager);
        const result = await vaultManager.renameVault(
          id,
          call.request.getName(),
        );
        response.setSuccess(result);
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
        await utils.checkPassword(call.metadata, sessionManager);
        const name = call.request.getName();
        const id = utils.parseVaultInput(name, vaultManager);
        const result = await vaultManager.deleteVault(id);
        response.setSuccess(result);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsPull: async (
      call: grpc.ServerUnaryCall<clientPB.VaultMessage, clientPB.EmptyMessage>,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new clientPB.EmptyMessage();
      try {
        await utils.checkPassword(call.metadata, sessionManager);
        // vault name
        const name = call.request.getName();
        // node id
        const id = call.request.getId();
        const vaultsList = await gitManager.scanNodeVaults(id);
        let vault, vaultId;
        for (const vaults in vaultsList) {
          vault = vaultsList[vaults].split('\t');
          if (vault[1] === name) {
            vaultId = vault[0];
          }
        }
        try {
          await gitManager.pullVault(vaultId, id);
        } catch (err) {
          if (err instanceof errors.ErrorVaultUnlinked) {
            await gitManager.cloneVault(vaultId, id);
          }
        }
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
        await utils.checkPassword(call.metadata, sessionManager);
        const vaults: Array<string> = await gitManager.scanNodeVaults(nodeId);
        let vaultMessage: clientPB.VaultMessage;
        for (const vault of vaults) {
          vaultMessage = new clientPB.VaultMessage();
          vaultMessage.setName(vault);
          await genWritable.next(vaultMessage);
        }
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
        await utils.checkPassword(call.metadata, sessionManager);
        const name = call.request.getName();
        const id = utils.parseVaultInput(name, vaultManager);
        const vault = vaultManager.getVault(id);
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
        clientPB.VaultSpecificMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new clientPB.EmptyMessage();
      try {
        await utils.checkPassword(call.metadata, sessionManager);
        const vaultMessage = call.request.getVault();
        if (!vaultMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const name = vaultMessage.getName();
        const id = utils.parseVaultInput(name, vaultManager);
        const vault = vaultManager.getVault(id);
        await vault.mkdir(call.request.getName(), { recursive: true });
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
        await utils.checkPassword(call.metadata, sessionManager);
        const name = call.request.getName();
        const id = utils.parseVaultInput(name, vaultManager);
        const stats = await vaultManager.vaultStats(id);
        response.setStats(JSON.stringify(stats));
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsDeleteSecret: async (
      call: grpc.ServerUnaryCall<
        clientPB.VaultSpecificMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await utils.checkPassword(call.metadata, sessionManager);
        const vaultMessage = call.request.getVault();
        if (!vaultMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const name = vaultMessage.getName();
        const id = utils.parseVaultInput(name, vaultManager);
        const vault = vaultManager.getVault(id);

        const res = await vault.deleteSecret(call.request.getName(), true);
        response.setSuccess(res);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsEditSecret: async (
      call: grpc.ServerUnaryCall<
        clientPB.SecretSpecificMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new clientPB.EmptyMessage();
      try {
        await utils.checkPassword(call.metadata, sessionManager);
        const secretMessage = call.request.getVault();
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
        const id = utils.parseVaultInput(name, vaultManager);
        const vault = vaultManager.getVault(id);
        await vault.updateSecret(
          secretMessage.getName(),
          Buffer.from(call.request.getContent()),
        );
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsGetSecret: async (
      call: grpc.ServerUnaryCall<
        clientPB.VaultSpecificMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.SecretMessage>,
    ): Promise<void> => {
      const response = new clientPB.SecretMessage();
      try {
        await utils.checkPassword(call.metadata, sessionManager);
        const vaultMessage = call.request.getVault();
        if (!vaultMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const name = vaultMessage.getName();
        const id = utils.parseVaultInput(name, vaultManager);
        const vault = vaultManager.getVault(id);

        const secret = await vault.getSecret(call.request.getName());
        response.setName(secret.toString());
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
        await utils.checkPassword(call.metadata, sessionManager);
        const vaultMessage = call.request.getVault();
        const oldSecretMessage = call.request.getOldname();
        const newSecretMessage = call.request.getNewname();
        if (!vaultMessage || !oldSecretMessage || !newSecretMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const name = vaultMessage.getName();
        const id = utils.parseVaultInput(name, vaultManager);
        const vault = vaultManager.getVault(id);
        const res = await vault.renameSecret(
          oldSecretMessage.getName(),
          newSecretMessage.getName(),
        );
        response.setSuccess(res);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsNewSecret: async (
      call: grpc.ServerUnaryCall<
        clientPB.SecretNewMessage,
        clientPB.StatusMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await utils.checkPassword(call.metadata, sessionManager);
        const vaultMessage = call.request.getVault();
        if (!vaultMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const name = vaultMessage.getName();
        const id = utils.parseVaultInput(name, vaultManager);
        const vault = vaultManager.getVault(id);
        const res = await vault.addSecret(
          call.request.getName(),
          Buffer.from(call.request.getContent()),
        );
        response.setSuccess(res);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsNewDirSecret: async (
      call: grpc.ServerUnaryCall<
        clientPB.SecretNewMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new clientPB.EmptyMessage();
      try {
        await utils.checkPassword(call.metadata, sessionManager);
        const vaultMessage = call.request.getVault();
        if (!vaultMessage) {
          callback({ code: grpc.status.NOT_FOUND }, null);
          return;
        }
        const name = vaultMessage.getName();
        const id = utils.parseVaultInput(name, vaultManager);
        const vault = vaultManager.getVault(id);
        const secretsPath = call.request.getName();

        await vault.addSecretDirectory(secretsPath);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsShare: async (
      call: grpc.ServerUnaryCall<clientPB.ShareMessage, clientPB.EmptyMessage>,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      try {
        await utils.checkPassword(call.metadata, sessionManager);
        const nodeIds = JSON.parse(call.request.getId()) as Array<string>;
        const set: boolean = call.request.getSet();
        const id = utils.parseVaultInput(call.request.getName(), vaultManager);
        for (const nodeId of nodeIds) {
          if (!set) {
            await vaultManager.setVaultPerm(nodeId, id);
          } else {
            await vaultManager.unsetVaultPerm(nodeId, id);
          }
        }
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      const response = new clientPB.EmptyMessage();
      callback(null, response);
    },
    vaultsPermissions: async (
      call: grpc.ServerWritableStream<
        clientPB.ShareMessage,
        clientPB.PermissionMessage
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);

      try {
        await utils.checkPassword(call.metadata, sessionManager);
        const name = call.request.getName();
        const id = utils.parseVaultInput(name, vaultManager);
        const node = call.request.getId();
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
