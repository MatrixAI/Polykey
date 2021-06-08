import { promisify } from 'util';
import * as grpc from '@grpc/grpc-js';
import * as grpcUtils from '../grpc/utils';
import * as clientPB from '../proto/js/Client_pb';

import { VaultManager, Vault } from '../vaults';
import { SessionManager, errors as sessionErrors } from '../session';

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
        clientPB.VaultMessage
      >,
    ): Promise<void> => {
      // call.request // PROCESS THE REQEUST MESSAGE
      const write = promisify(call.write).bind(call);
      const vaults: Array<{
        name: string;
        id: string;
      }> = vaultManager.listVaults();
      let vaultMessage: clientPB.VaultMessage;
      for (const vault of vaults) {
        vaultMessage = new clientPB.VaultMessage();
        vaultMessage.setName(vault.name);
        vaultMessage.setId(vault.id);
        await write(vaultMessage);
      }
      call.end();
    },
    vaultsCreate: async (
      call: grpc.ServerUnaryCall<clientPB.VaultMessage, clientPB.StatusMessage>,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      let status: Vault;
      try {
        console.log(call.request.getName());
        status = await vaultManager.createVault(call.request.getName());
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
        const result = await vaultManager.renameVault(
          call.request.getId(),
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
        const result = await vaultManager.deleteVault(call.request.getId());
        response.setSuccess(result);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    vaultsListSecrets: async (
      call: grpc.ServerWritableStream<
        clientPB.VaultMessage,
        clientPB.SecretMessage
      >,
    ): Promise<void> => {
      const write = promisify(call.write).bind(call);
      const vault = vaultManager.getVault(call.request.getId());
      const secrets: Array<string> = await vault.listSecrets();
      let secretMessage = new clientPB.SecretMessage();
      for (const secret of secrets) {
        secretMessage = new clientPB.SecretMessage();
        secretMessage.setName(secret);
        await write(secretMessage);
      }
      call.end();
    },
    vaultsMkdir: async (
      call: grpc.ServerUnaryCall<
        clientPB.VaultSpecificMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new clientPB.EmptyMessage();
      const vaultMessage = call.request.getVault();
      if (!vaultMessage) {
        callback({ code: grpc.status.NOT_FOUND }, null);
        return;
      }
      const vaultId = vaultMessage.getId();
      const vault = vaultManager.getVault(vaultId);
      await vault.mkdir(call.request.getName(), { recursive: true });
      callback(null, response);
    },
    vaultsStat: async (
      call: grpc.ServerUnaryCall<clientPB.VaultMessage, clientPB.StatMessage>,
      callback: grpc.sendUnaryData<clientPB.StatMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatMessage();
      const vaultId = call.request.getId();
      if (!vaultId) {
        callback({ code: grpc.status.NOT_FOUND }, null);
        return;
      }
      const stats = await vaultManager.vaultStats(vaultId);
      response.setStats(JSON.stringify(stats));
      callback(null, response);
    },
    vaultsDeleteSecret: async (
      call: grpc.ServerUnaryCall<
        clientPB.VaultSpecificMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      const vaultMessage = call.request.getVault();
      if (!vaultMessage) {
        callback({ code: grpc.status.NOT_FOUND }, null);
        return;
      }
      const vaultId = vaultMessage.getId();
      const vault = vaultManager.getVault(vaultId);
      const res = await vault.deleteSecret(call.request.getName(), true);
      response.setSuccess(res);
      callback(null, response);
    },
    vaultsEditSecret: async (
      call: grpc.ServerUnaryCall<
        clientPB.SecretSpecificMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new clientPB.EmptyMessage();
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
      const vaultId = vaultMessage.getId();

      const vault = vaultManager.getVault(vaultId);
      await vault.updateSecret(
        secretMessage.getName(),
        Buffer.from(call.request.getContent()),
      );
      callback(null, response);
    },
    vaultsGetSecret: async (
      call: grpc.ServerUnaryCall<
        clientPB.VaultSpecificMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.SecretMessage>,
    ): Promise<void> => {
      const response = new clientPB.SecretMessage();
      const vaultMessage = call.request.getVault();
      if (!vaultMessage) {
        callback({ code: grpc.status.NOT_FOUND }, null);
        return;
      }
      const vaultId = vaultMessage.getId();

      const vault = vaultManager.getVault(vaultId);
      const secret = await vault.getSecret(call.request.getName());
      response.setName(secret.toString());
      callback(null, response);
    },
    vaultsRenameSecret: async (
      call: grpc.ServerUnaryCall<
        clientPB.VaultSpecificMessage,
        clientPB.StatusMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      const vaultMessage = call.request.getVault();
      if (!vaultMessage) {
        callback({ code: grpc.status.NOT_FOUND }, null);
        return;
      }
      const vaultId = vaultMessage.getId();

      const vault = vaultManager.getVault(vaultId);
      const res = await vault.renameSecret(
        vaultMessage.getName(),
        call.request.getName(),
      );
      response.setSuccess(res);
      callback(null, response);
    },
    vaultsNewSecret: async (
      call: grpc.ServerUnaryCall<
        clientPB.VaultSpecificMessage,
        clientPB.StatusMessage
      >,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      const vaultMessage = call.request.getVault();
      if (!vaultMessage) {
        callback({ code: grpc.status.NOT_FOUND }, null);
        return;
      }
      const vaultId = vaultMessage.getId();

      const vault = vaultManager.getVault(vaultId);
      const res = await vault.addSecret(
        vaultMessage.getName(),
        Buffer.from(call.request.getName()),
      );
      response.setSuccess(res);
      callback(null, response);
    },
    vaultsNewDirSecret: async (
      call: grpc.ServerUnaryCall<clientPB.VaultMessage, clientPB.EmptyMessage>,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new clientPB.EmptyMessage();
      const vaultId = call.request.getId();
      const secretsPath = call.request.getName();

      const vault = vaultManager.getVault(vaultId);
      await vault.addSecretDirectory(secretsPath);
      callback(null, response);
    },
  };
};

export default createVaultRPC;
