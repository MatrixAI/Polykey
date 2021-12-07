import type PolykeyAgent from '../PolykeyAgent';
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
import type { FileSystem } from '../types';

import type * as grpc from '@grpc/grpc-js';
import type { IClientServiceServer } from '../proto/js/polykey/v1/client_service_grpc_pb';
import { promisify } from 'util';
import createStatusRPC from './rpcStatus';
import createSessionsRPC from './rpcSessions';
import createVaultRPC from './rpcVaults';
import createKeysRPC from './rpcKeys';
import createNodesRPC from './rpcNodes';
import createGestaltRPC from './rpcGestalts';
import createIdentitiesRPC from './rpcIdentities';
import createNotificationsRPC from './rpcNotifications';
import * as clientUtils from './utils';
import * as grpcUtils from '../grpc/utils';
import * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import { ClientServiceService } from '../proto/js/polykey/v1/client_service_grpc_pb';

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
  clientGrpcServer,
  fs,
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
  clientGrpcServer: GRPCServer;
  fs: FileSystem;
}) {
  const authenticate = clientUtils.authenticator(sessionManager, keyManager);
  const clientService: IClientServiceServer = {
    ...createStatusRPC({
      authenticate,
      keyManager,
    }),
    ...createSessionsRPC({
      authenticate,
      sessionManager,
      keyManager,
    }),
    ...createVaultRPC({
      vaultManager,
      authenticate,
      fs,
    }),
    ...createKeysRPC({
      keyManager,
      nodeManager,
      authenticate,
      fwdProxy,
      revProxy,
      clientGrpcServer,
    }),
    ...createIdentitiesRPC({
      identitiesManager,
      gestaltGraph,
      nodeManager,
      authenticate,
    }),
    ...createGestaltRPC({
      gestaltGraph,
      authenticate,
      discovery,
    }),
    ...createNodesRPC({
      nodeManager,
      notificationsManager,
      authenticate,
    }),
    ...createNotificationsRPC({
      notificationsManager,
      authenticate,
    }),
    nodesList: async (
      call: grpc.ServerWritableStream<utilsPB.EmptyMessage, nodesPB.Node>,
    ): Promise<void> => {
      // Call.request // PROCESS THE REQEUST MESSAGE
      const nodeMessage = new nodesPB.Node();
      nodeMessage.setNodeId('some node name');
      const write = promisify(call.write).bind(call);
      await write(nodeMessage);
      call.end();
    },
    agentStop: async (
      call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new utilsPB.EmptyMessage();
      if (!polykeyAgent.running) {
        return callback(null, response);
      }
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);
        // Respond first to close the GRPC connection
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      // Stop is called after GRPC resources are cleared
      await polykeyAgent.stop();
      return;
    },
  };

  return clientService;
}

export default createClientService;

export { ClientServiceService };
