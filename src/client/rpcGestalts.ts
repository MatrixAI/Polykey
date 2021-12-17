import type { Discovery } from '../discovery';
import type { GestaltGraph } from '../gestalts';
import type { Gestalt } from '../gestalts/types';
import type { IdentityId, ProviderId } from '../identities/types';

import type * as grpc from '@grpc/grpc-js';
import type * as clientUtils from './utils';
import type * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';
import type * as identitiesPB from '../proto/js/polykey/v1/identities/identities_pb';

import { makeGestaltAction } from '../gestalts/utils';

import * as grpcUtils from '../grpc/utils';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import * as gestaltsPB from '../proto/js/polykey/v1/gestalts/gestalts_pb';
import * as permissionsPB from '../proto/js/polykey/v1/permissions/permissions_pb';
import { makeNodeId } from '../nodes/utils';

const createGestaltsRPC = ({
  gestaltGraph,
  authenticate,
  discovery,
}: {
  gestaltGraph: GestaltGraph;
  authenticate: clientUtils.Authenticate;
  discovery: Discovery;
}) => {
  return {
    gestaltsGestaltGetByNode: async (
      call: grpc.ServerUnaryCall<nodesPB.Node, gestaltsPB.Graph>,
      callback: grpc.sendUnaryData<gestaltsPB.Graph>,
    ): Promise<void> => {
      const response = new gestaltsPB.Graph();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const gestalt = await gestaltGraph.getGestaltByNode(
          makeNodeId(call.request.getNodeId()),
        );
        if (gestalt != null) {
          response.setGestaltGraph(JSON.stringify(gestalt));
        }
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
    },
    gestaltsGestaltGetByIdentity: async (
      call: grpc.ServerUnaryCall<identitiesPB.Provider, gestaltsPB.Graph>,
      callback: grpc.sendUnaryData<gestaltsPB.Graph>,
    ): Promise<void> => {
      const response = new gestaltsPB.Graph();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const gestalt = await gestaltGraph.getGestaltByIdentity(
          call.request.getProviderId() as ProviderId,
          call.request.getIdentityId() as IdentityId,
        );
        if (gestalt != null) {
          response.setGestaltGraph(JSON.stringify(gestalt));
        }
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
    },
    gestaltsGestaltList: async (
      call: grpc.ServerWritableStream<utilsPB.EmptyMessage, gestaltsPB.Gestalt>,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      let gestaltMessage: gestaltsPB.Gestalt;
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const certs: Array<Gestalt> = await gestaltGraph.getGestalts();
        for (const cert of certs) {
          gestaltMessage = new gestaltsPB.Gestalt();
          gestaltMessage.setName(JSON.stringify(cert));
          await genWritable.next(gestaltMessage);
        }
        await genWritable.next(null);
        return;
      } catch (err) {
        await genWritable.throw(err);
        return;
      }
    },
    gestaltsDiscoveryByNode: async (
      call: grpc.ServerUnaryCall<nodesPB.Node, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      const response = new utilsPB.EmptyMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);
        // Constructing identity info.
        const gen = discovery.discoverGestaltByNode(
          makeNodeId(info.getNodeId()),
        );
        for await (const _ of gen) {
          // Empty
        }
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
    },
    gestaltsDiscoveryByIdentity: async (
      call: grpc.ServerUnaryCall<identitiesPB.Provider, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      const response = new utilsPB.EmptyMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);
        // Constructing identity info.
        const gen = discovery.discoverGestaltByIdentity(
          info.getProviderId() as ProviderId,
          info.getIdentityId() as IdentityId,
        );
        for await (const _ of gen) {
          // Empty
        }
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
    },
    gestaltsActionsGetByNode: async (
      call: grpc.ServerUnaryCall<nodesPB.Node, permissionsPB.Actions>,
      callback: grpc.sendUnaryData<permissionsPB.Actions>,
    ): Promise<void> => {
      const info = call.request;
      const response = new permissionsPB.Actions();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const result = await gestaltGraph.getGestaltActionsByNode(
          makeNodeId(info.getNodeId()),
        );
        if (result == null) {
          // Node doesn't exist, so no permissions. might throw error instead TBD.
          response.setActionList([]);
        } else {
          // Contains permission
          const actions = Object.keys(result);
          response.setActionList(actions);
        }
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
    },
    gestaltsActionsGetByIdentity: async (
      call: grpc.ServerUnaryCall<identitiesPB.Provider, permissionsPB.Actions>,
      callback: grpc.sendUnaryData<permissionsPB.Actions>,
    ): Promise<void> => {
      const info = call.request;
      const response = new permissionsPB.Actions();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const providerId = info.getProviderId() as ProviderId;
        const identityId = info.getIdentityId() as IdentityId;
        const result = await gestaltGraph.getGestaltActionsByIdentity(
          providerId,
          identityId,
        );
        if (result == null) {
          // Node doesn't exist, so no permissions. might throw error instead TBD.
          response.setActionList([]);
        } else {
          // Contains permission
          const actions = Object.keys(result);
          response.setActionList(actions);
        }
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
    },
    gestaltsActionsSetByNode: async (
      call: grpc.ServerUnaryCall<permissionsPB.ActionSet, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      const response = new utilsPB.EmptyMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);
        // Setting the action.
        const action = makeGestaltAction(info.getAction());
        const nodeId = makeNodeId(info.getNode()?.getNodeId());
        await gestaltGraph.setGestaltActionByNode(nodeId, action);
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
    },
    gestaltsActionsSetByIdentity: async (
      call: grpc.ServerUnaryCall<permissionsPB.ActionSet, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      const response = new utilsPB.EmptyMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);
        // Setting the action.
        const action = makeGestaltAction(info.getAction());
        const providerId = info.getIdentity()?.getProviderId() as ProviderId;
        const identityId = info.getIdentity()?.getIdentityId() as IdentityId;
        await gestaltGraph.setGestaltActionByIdentity(
          providerId,
          identityId,
          action,
        );
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
    },
    gestaltsActionsUnsetByNode: async (
      call: grpc.ServerUnaryCall<permissionsPB.ActionSet, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      const response = new utilsPB.EmptyMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);
        // Setting the action.
        const action = makeGestaltAction(info.getAction());
        const nodeId = makeNodeId(info.getNode()?.getNodeId());
        await gestaltGraph.unsetGestaltActionByNode(nodeId, action);
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
    },
    gestaltsActionsUnsetByIdentity: async (
      call: grpc.ServerUnaryCall<permissionsPB.ActionSet, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      const response = new utilsPB.EmptyMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);
        // Setting the action.
        const action = makeGestaltAction(info.getAction());
        const providerId = info.getIdentity()?.getProviderId() as ProviderId;
        const identityId = info.getIdentity()?.getIdentityId() as IdentityId;
        await gestaltGraph.unsetGestaltActionByIdentity(
          providerId,
          identityId,
          action,
        );
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
    },
  };
};

export default createGestaltsRPC;
