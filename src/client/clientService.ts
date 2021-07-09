import { promisify } from 'util';
import * as grpc from '@grpc/grpc-js';

import { ClientService, IClientServer } from '../proto/js/Client_grpc_pb';

import * as clientPB from '../proto/js/Client_pb';

import createEchoRPC from './rpcEcho';
import createVaultRPC from './rpcVaults';
import createKeysRPC from './rpcKeys';
import createGestaltRPC from './rpcGestalts';
import createIdentitiesRPC from './rpcIdentities';
import { PolykeyAgent } from '../';
import * as grpcUtils from '../grpc/utils';

/**
 * Creates the client service for use with a GRPCServer
 * @param domains An object representing all the domains / managers the client server uses.
 * @returns an IClientServer object
 */
function createClientService({ polykeyAgent }: { polykeyAgent: PolykeyAgent }) {
  const clientService: IClientServer = {
    ...createEchoRPC(),
    ...createVaultRPC({
      vaultManager: polykeyAgent.vaults,
      gitManager: polykeyAgent.gitManager,
      sessionManager: polykeyAgent.sessionManager,
    }),
    ...createKeysRPC({
      keyManager: polykeyAgent.keys,
      sessionManager: polykeyAgent.sessionManager,
    }),
    ...createIdentitiesRPC({
      identitiesManager: polykeyAgent.identities,
    }),
    ...createGestaltRPC({
      gestaltGraph: polykeyAgent.gestalts,
    }),
    nodesList: async (
      call: grpc.ServerWritableStream<
        clientPB.EmptyMessage,
        clientPB.NodeMessage
      >,
    ): Promise<void> => {
      // call.request // PROCESS THE REQEUST MESSAGE
      const nodeMessage = new clientPB.NodeMessage();
      nodeMessage.setName('some node name');
      const write = promisify(call.write).bind(call);
      await write(nodeMessage);
      call.end();
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
      const write = promisify(call.write).bind(call);
      await write(gestaltMessage);
      call.end();
    },
    agentStop: async (
      call: grpc.ServerUnaryCall<clientPB.EmptyMessage, clientPB.EmptyMessage>,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      try {
        const response = new clientPB.EmptyMessage();
        setTimeout(async () => {
          await polykeyAgent.stop();
        }, 50);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
  };

  return clientService;
}

export default createClientService;

export { ClientService };
