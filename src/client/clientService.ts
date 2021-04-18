import util from 'util';
import * as grpc from '@grpc/grpc-js';
import * as clientPB from '../proto/js/Client_pb';
import { ClientService, IClientServer } from '../proto/js/Client_grpc_pb';
import { KeyManager } from '../keys';
import { VaultManager } from '../vaults';
import { NodeManager } from '../nodes';

/**
 * Creates the client service for use with a GRPCServer
 * @param domains An object representing all the domains / managers the client server uses.
 * @returns an IClientServer object
 */
function createClientService({
  keyManager,
  vaultManager,
  nodeManager,
}: {
  keyManager: KeyManager;
  vaultManager: VaultManager;
  nodeManager: NodeManager;
}) {
  const clientService: IClientServer = {
    echo: async (
      call: grpc.ServerUnaryCall<clientPB.EchoMessage, clientPB.EchoMessage>,
      callback: grpc.sendUnaryData<clientPB.EchoMessage>,
    ): Promise<void> => {
      const response = new clientPB.EchoMessage();
      response.setChallenge(call.request.getChallenge());
      callback(null, response);
    },
    vaultsList: async (
      call: grpc.ServerWritableStream<
        clientPB.EmptyMessage,
        clientPB.VaultMessage
      >,
    ): Promise<void> => {
      // call.request // PROCESS THE REQEUST MESSAGE
      const write = util.promisify(call.write).bind(call);
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
      await vaultManager.createVault(call.request.getName());
      response.setSuccess(true);
      callback(null, response);
    },
    vaultsDelete: async (
      call: grpc.ServerUnaryCall<clientPB.VaultMessage, clientPB.StatusMessage>,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        const result = await vaultManager.deleteVault(call.request.getName());
        response.setSuccess(result);
        callback(null, response);
      } catch (err) {
        callback({ code: grpc.status.NOT_FOUND }, null);
      }
    },
    vaultsListSecrets: async (
      call: grpc.ServerWritableStream<
        clientPB.VaultMessage,
        clientPB.SecretMessage
      >,
    ): Promise<void> => {
      const write = util.promisify(call.write).bind(call);
      const vault = vaultManager.getVault(call.request.getName());
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
      const vaultName = vaultMessage.getName();
      const vault = vaultManager.getVault(vaultName);
      await vault.mkdir(call.request.getName(), { recursive: true });
      callback(null, response);
    },
    nodesList: async (
      call: grpc.ServerWritableStream<
        clientPB.EmptyMessage,
        clientPB.NodeMessage
      >,
    ): Promise<void> => {
      // call.request // PROCESS THE REQEUST MESSAGE
      const nodeMessage = new clientPB.NodeMessage();
      nodeMessage.setName('some node name');
      const write = util.promisify(call.write).bind(call);
      await write(nodeMessage);
      call.end();
    },
    commitSync: async (
      call: grpc.ServerReadableStream<
        clientPB.CommitMessage,
        clientPB.CommitMessage
      >,
      callback: grpc.sendUnaryData<clientPB.CommitMessage>,
    ): Promise<void> => {
      // we get a message from the call
      const response = new clientPB.CommitMessage();
      response.setName('some arbitrary name');
      // response.setChallenge(call.request.getChallenge());
      callback(null, response);
    },
    gestaltSync: async (
      call: grpc.ServerDuplexStream<
        clientPB.GestaltMessage,
        clientPB.GestaltMessage
      >,
    ): Promise<void> => {
      // it is readable
      // and writable
      // AT THE SAME TIME!
      // that means you can do a dual wrap
      const gestaltMessage = new clientPB.GestaltMessage();
      gestaltMessage.setName('some gestalt name');
      const write = util.promisify(call.write).bind(call);
      await write(gestaltMessage);
      call.end();
    },
  };

  return clientService;
}

export default createClientService;

export { ClientService };
