import type { Discovery } from '../discovery';
import type { GestaltGraph } from '../gestalts';
import type { SessionManager } from '../sessions';
import type { Gestalt } from '../gestalts/types';
import type { IdentityId, ProviderId } from '../identities/types';

import * as utils from './utils';
import * as errors from '../errors';
import * as grpc from '@grpc/grpc-js';

import { makeGestaltAction } from '../gestalts/utils';

import * as grpcUtils from '../grpc/utils';
import { messages } from '../client';
import { makeNodeId } from '../nodes/utils';

const createGestaltsRPC = ({
  gestaltGraph,
  sessionManager,
  discovery,
}: {
  gestaltGraph: GestaltGraph;
  sessionManager: SessionManager;
  discovery: Discovery;
}) => {
  return {
    gestaltsGestaltGetByNode: async (
      call: grpc.ServerUnaryCall<messages.nodes.Node, messages.gestalts.Graph>,
      callback: grpc.sendUnaryData<messages.gestalts.Graph>,
    ): Promise<void> => {
      const response = new messages.gestalts.Graph();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const gestalt = await gestaltGraph.getGestaltByNode(
          makeNodeId(call.request.getNodeId()),
        );
        if (gestalt != null) {
          response.setGestaltGraph(JSON.stringify(gestalt));
        }
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    gestaltsGestaltGetByIdentity: async (
      call: grpc.ServerUnaryCall<
        messages.identities.Provider,
        messages.gestalts.Graph
      >,
      callback: grpc.sendUnaryData<messages.gestalts.Graph>,
    ): Promise<void> => {
      const response = new messages.gestalts.Graph();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const gestalt = await gestaltGraph.getGestaltByIdentity(
          call.request.getProviderId() as ProviderId,
          call.request.getMessage() as IdentityId,
        );
        if (gestalt != null) {
          response.setGestaltGraph(JSON.stringify(gestalt));
        }
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    gestaltsGestaltList: async (
      call: grpc.ServerWritableStream<
        messages.common.EmptyMessage,
        messages.gestalts.Gestalt
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      let gestaltMessage: messages.gestalts.Gestalt;
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const certs: Array<Gestalt> = await gestaltGraph.getGestalts();
        for (const cert of certs) {
          gestaltMessage = new messages.gestalts.Gestalt();
          gestaltMessage.setName(JSON.stringify(cert));
          await genWritable.next(gestaltMessage);
        }
        await genWritable.next(null);
      } catch (err) {
        await genWritable.throw(err);
      }
    },
    gestaltsDiscoveryByNode: async (
      call: grpc.ServerUnaryCall<
        messages.nodes.Node,
        messages.common.EmptyMessage
      >,
      callback: grpc.sendUnaryData<messages.common.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      const emptyMessage = new messages.common.EmptyMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        //Constructing identity info.
        const gen = discovery.discoverGestaltByNode(
          makeNodeId(info.getNodeId()),
        );
        for await (const _ of gen) {
          // Empty
        }
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, emptyMessage);
    },
    gestaltsDiscoveryByIdentity: async (
      call: grpc.ServerUnaryCall<
        messages.identities.Provider,
        messages.common.EmptyMessage
      >,
      callback: grpc.sendUnaryData<messages.common.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      const emptyMessage = new messages.common.EmptyMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        //Constructing identity info.
        const gen = discovery.discoverGestaltByIdentity(
          info.getProviderId() as ProviderId,
          info.getMessage() as IdentityId,
        );
        for await (const _ of gen) {
          // Empty
        }
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, emptyMessage);
    },
    gestaltsActionsGetByNode: async (
      call: grpc.ServerUnaryCall<
        messages.nodes.Node,
        messages.permissions.Actions
      >,
      callback: grpc.sendUnaryData<messages.permissions.Actions>,
    ): Promise<void> => {
      const info = call.request;
      const response = new messages.permissions.Actions();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
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
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, response);
    },
    gestaltsActionsGetByIdentity: async (
      call: grpc.ServerUnaryCall<
        messages.identities.Provider,
        messages.permissions.Actions
      >,
      callback: grpc.sendUnaryData<messages.permissions.Actions>,
    ): Promise<void> => {
      const info = call.request;
      const response = new messages.permissions.Actions();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const providerId = info.getProviderId() as ProviderId;
        const identityId = info.getMessage() as IdentityId;
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
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, response);
    },
    gestaltsActionsSetByNode: async (
      call: grpc.ServerUnaryCall<
        messages.permissions.ActionSet,
        messages.common.EmptyMessage
      >,
      callback: grpc.sendUnaryData<messages.common.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      const response = new messages.common.EmptyMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        //Checking
        switch (info.getNodeOrProviderCase()) {
          default:
          case messages.permissions.ActionSet.NodeOrProviderCase
            .NODE_OR_PROVIDER_NOT_SET:
          case messages.permissions.ActionSet.NodeOrProviderCase.IDENTITY:
            throw new errors.ErrorGRPCInvalidMessage(
              'Node not set for SetActionMessage.',
            );
          case messages.permissions.ActionSet.NodeOrProviderCase.NODE:
            break; //This is fine.
        }

        //Setting the action.
        const action = makeGestaltAction(info.getAction());
        const nodeId = makeNodeId(info.getNode()?.getNodeId());
        await gestaltGraph.setGestaltActionByNode(nodeId, action);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, response);
    },
    gestaltsActionsSetByIdentity: async (
      call: grpc.ServerUnaryCall<
        messages.permissions.ActionSet,
        messages.common.EmptyMessage
      >,
      callback: grpc.sendUnaryData<messages.common.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      const response = new messages.common.EmptyMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        //Checking
        switch (info.getNodeOrProviderCase()) {
          default:
          case messages.permissions.ActionSet.NodeOrProviderCase.NODE:
          case messages.permissions.ActionSet.NodeOrProviderCase
            .NODE_OR_PROVIDER_NOT_SET:
            throw new errors.ErrorGRPCInvalidMessage(
              'Identity not set for SetActionMessage.',
            );
          case messages.permissions.ActionSet.NodeOrProviderCase.IDENTITY:
            break; //This is fine.
        }

        //Setting the action.
        const action = makeGestaltAction(info.getAction());
        const providerId = info.getIdentity()?.getProviderId() as ProviderId;
        const identityId = info.getIdentity()?.getMessage() as IdentityId;
        await gestaltGraph.setGestaltActionByIdentity(
          providerId,
          identityId,
          action,
        );
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, response);
    },
    gestaltsActionsUnsetByNode: async (
      call: grpc.ServerUnaryCall<
        messages.permissions.ActionSet,
        messages.common.EmptyMessage
      >,
      callback: grpc.sendUnaryData<messages.common.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      const response = new messages.common.EmptyMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        //Checking
        switch (info.getNodeOrProviderCase()) {
          default:
          case messages.permissions.ActionSet.NodeOrProviderCase
            .NODE_OR_PROVIDER_NOT_SET:
          case messages.permissions.ActionSet.NodeOrProviderCase.IDENTITY:
            throw new errors.ErrorGRPCInvalidMessage(
              'Node not set for SetActionMessage.',
            );
          case messages.permissions.ActionSet.NodeOrProviderCase.NODE:
            break; //This is fine.
        }

        //Setting the action.
        const action = makeGestaltAction(info.getAction());
        const nodeId = makeNodeId(info.getNode()?.getNodeId());
        await gestaltGraph.unsetGestaltActionByNode(nodeId, action);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, response);
    },
    gestaltsActionsUnsetByIdentity: async (
      call: grpc.ServerUnaryCall<
        messages.permissions.ActionSet,
        messages.common.EmptyMessage
      >,
      callback: grpc.sendUnaryData<messages.common.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      const response = new messages.common.EmptyMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        //Checking
        switch (info.getNodeOrProviderCase()) {
          default:
          case messages.permissions.ActionSet.NodeOrProviderCase.NODE:
          case messages.permissions.ActionSet.NodeOrProviderCase
            .NODE_OR_PROVIDER_NOT_SET:
            throw new errors.ErrorGRPCInvalidMessage(
              'Identity not set for SetActionMessage.',
            );
          case messages.permissions.ActionSet.NodeOrProviderCase.IDENTITY:
            break; //This is fine.
        }

        //Setting the action.
        const action = makeGestaltAction(info.getAction());
        const providerId = info.getIdentity()?.getProviderId() as ProviderId;
        const identityId = info.getIdentity()?.getMessage() as IdentityId;
        await gestaltGraph.unsetGestaltActionByIdentity(
          providerId,
          identityId,
          action,
        );
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, response);
    },
  };
};

export default createGestaltsRPC;
