import type { KeyManager } from '../keys';
import type { VaultManager } from '../vaults';
import type { NodeManager } from '../nodes';
import type { IdentitiesManager } from '../identities';
import type { GestaltGraph } from '../gestalts';
import type { SessionManager } from '../sessions';
import type { NotificationsManager } from '../notifications';
import type { Discovery } from '../discovery';
import type { ForwardProxy, ReverseProxy } from '../network';
import type { GRPCServer } from '../grpc';

import { promisify } from 'util';
import * as grpc from '@grpc/grpc-js';

import { ClientService, IClientServer } from '../proto/js/Client_grpc_pb';

import { messages } from '.';

import createEchoRPC from './rpcEcho';
import createSessionRPC from './rpcSession';
import createVaultRPC from './rpcVaults';
import createKeysRPC from './rpcKeys';
import createNodesRPC from './rpcNodes';
import createGestaltRPC from './rpcGestalts';
import createIdentitiesRPC from './rpcIdentities';
import { PolykeyAgent } from '../';
import * as grpcUtils from '../grpc/utils';
import createNotificationsRPC from './rpcNotifications';
import * as utils from './utils';

/**
 * Creates the client service for use with a GRPCServer
 * @param domains An object representing all the domains / managers the client server uses.
 * @returns an IClientServer object
 */
function createClientService({
  polykeyAgent,
  keyManager,
  vaultManager,
  nodeManager,
  identitiesManager,
  gestaltGraph,
  sessionManager,
  notificationsManager,
  discovery,
  fwdProxy,
  revProxy,
  grpcServer,
}: {
  polykeyAgent: PolykeyAgent;
  keyManager: KeyManager;
  vaultManager: VaultManager;
  nodeManager: NodeManager;
  identitiesManager: IdentitiesManager;
  gestaltGraph: GestaltGraph;
  sessionManager: SessionManager;
  notificationsManager: NotificationsManager;
  discovery: Discovery;
  fwdProxy: ForwardProxy;
  revProxy: ReverseProxy;
  grpcServer: GRPCServer;
}) {
  const clientService: IClientServer = {
    ...createEchoRPC({
      sessionManager,
    }),
    ...createSessionRPC({
      sessionManager,
      keyManager,
    }),
    ...createVaultRPC({
      vaultManager,
      sessionManager,
    }),
    ...createKeysRPC({
      keyManager,
      nodeManager,
      sessionManager,
      fwdProxy,
      revProxy,
      grpcServer,
    }),
    ...createIdentitiesRPC({
      identitiesManager,
      gestaltGraph,
      nodeManager,
      sessionManager,
    }),
    ...createGestaltRPC({
      gestaltGraph,
      sessionManager,
      discovery,
    }),
    ...createNodesRPC({
      nodeManager,
      notificationsManager,
      sessionManager,
    }),
    ...createNotificationsRPC({
      notificationsManager,
      sessionManager,
    }),
    nodesList: async (
      call: grpc.ServerWritableStream<
        messages.EmptyMessage,
        messages.nodes.Node
      >,
    ): Promise<void> => {
      // Call.request // PROCESS THE REQEUST MESSAGE
      const nodeMessage = new messages.nodes.Node();
      nodeMessage.setNodeId('some node name');
      const write = promisify(call.write).bind(call);
      await write(nodeMessage);
      call.end();
    },
    agentStop: async (
      call: grpc.ServerUnaryCall<messages.EmptyMessage, messages.EmptyMessage>,
      callback: grpc.sendUnaryData<messages.EmptyMessage>,
    ): Promise<void> => {
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const response = new messages.EmptyMessage();
        setTimeout(async () => {
          await polykeyAgent.stop();
          await polykeyAgent.destroy();
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
