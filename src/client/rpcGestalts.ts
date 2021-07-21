import type { Gestalt } from '../gestalts/types';
import type { NodeId } from '../nodes/types';
import type { IdentityId, ProviderId } from '../identities/types';
import type { GestaltGraph } from '../gestalts';

import * as grpc from '@grpc/grpc-js';
import * as clientPB from '../proto/js/Client_pb';
import { promisify } from '../utils';

const createGestaltsRPC = ({
  gestaltGraph,
}: {
  gestaltGraph: GestaltGraph;
}) => {
  return {
    gestaltsGetNode: async (
      call: grpc.ServerUnaryCall<
        clientPB.GestaltMessage,
        clientPB.GestaltMessage
      >,
      callback: grpc.sendUnaryData<clientPB.GestaltMessage>,
    ): Promise<void> => {
      const response = new clientPB.GestaltMessage();
      try {
        const gestalt = await gestaltGraph.getGestaltByNode(
          call.request.getName() as NodeId,
        );
        if (gestalt) {
          response.setName(JSON.stringify(gestalt));
        }
      } catch (err) {
        callback(err, response);
      }
      callback(null, response);
    },
    gestaltsGetIdentity: async (
      call: grpc.ServerUnaryCall<
        clientPB.ProviderMessage,
        clientPB.GestaltMessage
      >,
      callback: grpc.sendUnaryData<clientPB.GestaltMessage>,
    ): Promise<void> => {
      const response = new clientPB.GestaltMessage();
      try {
        const gestalt = await gestaltGraph.getGestaltByIdentity(
          call.request.getId() as ProviderId,
          call.request.getMessage() as IdentityId,
        );
        if (gestalt) {
          response.setName(JSON.stringify(gestalt));
        }
      } catch (err) {
        callback(err, response);
      }
      callback(null, response);
    },
    gestaltsList: async (
      call: grpc.ServerWritableStream<
        clientPB.EmptyMessage,
        clientPB.GestaltMessage
      >,
    ): Promise<void> => {
      const write = promisify(call.write).bind(call);
      const certs: Array<Gestalt> = await gestaltGraph.getGestalts();
      let gestaltMessage: clientPB.GestaltMessage;
      for (const cert of certs) {
        gestaltMessage = new clientPB.GestaltMessage();
        gestaltMessage.setName(JSON.stringify(cert));
        await write(gestaltMessage);
      }
      call.end();
    },
    gestaltsSetNode: async (
      call: grpc.ServerUnaryCall<
        clientPB.GestaltTrustMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      // gestaltGraph.setNode()
    },
    gestaltsSetIdentity: async (
      call: grpc.ServerUnaryCall<
        clientPB.GestaltTrustMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      // gestaltGraph.setIdentity()
    },
  };
};

export default createGestaltsRPC;
