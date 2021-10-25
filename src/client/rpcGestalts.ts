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
import * as clientPB from '../proto/js/Client_pb';
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
      call: grpc.ServerUnaryCall<
        clientPB.NodeMessage,
        clientPB.GestaltGraphMessage
      >,
      callback: grpc.sendUnaryData<clientPB.GestaltGraphMessage>,
    ): Promise<void> => {
      const response = new clientPB.GestaltGraphMessage();
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
        clientPB.ProviderMessage,
        clientPB.GestaltGraphMessage
      >,
      callback: grpc.sendUnaryData<clientPB.GestaltGraphMessage>,
    ): Promise<void> => {
      const response = new clientPB.GestaltGraphMessage();
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
        clientPB.EmptyMessage,
        clientPB.GestaltMessage
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      let gestaltMessage: clientPB.GestaltMessage;
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const certs: Array<Gestalt> = await gestaltGraph.getGestalts();
        for (const cert of certs) {
          gestaltMessage = new clientPB.GestaltMessage();
          gestaltMessage.setName(JSON.stringify(cert));
          await genWritable.next(gestaltMessage);
        }
        await genWritable.next(null);
      } catch (err) {
        await genWritable.throw(err);
      }
    },
    gestaltsDiscoveryByNode: async (
      call: grpc.ServerUnaryCall<clientPB.NodeMessage, clientPB.EmptyMessage>,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      const emptyMessage = new clientPB.EmptyMessage();
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
        clientPB.ProviderMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      const emptyMessage = new clientPB.EmptyMessage();
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
      call: grpc.ServerUnaryCall<clientPB.NodeMessage, clientPB.ActionsMessage>,
      callback: grpc.sendUnaryData<clientPB.ActionsMessage>,
    ): Promise<void> => {
      const info = call.request;
      const response = new clientPB.ActionsMessage();
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
        clientPB.ProviderMessage,
        clientPB.ActionsMessage
      >,
      callback: grpc.sendUnaryData<clientPB.ActionsMessage>,
    ): Promise<void> => {
      const info = call.request;
      const response = new clientPB.ActionsMessage();
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
        clientPB.SetActionsMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      const response = new clientPB.EmptyMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        //Checking
        switch (info.getNodeOrProviderCase()) {
          default:
          case clientPB.SetActionsMessage.NodeOrProviderCase
            .NODE_OR_PROVIDER_NOT_SET:
          case clientPB.SetActionsMessage.NodeOrProviderCase.IDENTITY:
            throw new errors.ErrorGRPCInvalidMessage(
              'Node not set for SetActionMessage.',
            );
          case clientPB.SetActionsMessage.NodeOrProviderCase.NODE:
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
        clientPB.SetActionsMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      const response = new clientPB.EmptyMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        //Checking
        switch (info.getNodeOrProviderCase()) {
          default:
          case clientPB.SetActionsMessage.NodeOrProviderCase.NODE:
          case clientPB.SetActionsMessage.NodeOrProviderCase
            .NODE_OR_PROVIDER_NOT_SET:
            throw new errors.ErrorGRPCInvalidMessage(
              'Identity not set for SetActionMessage.',
            );
          case clientPB.SetActionsMessage.NodeOrProviderCase.IDENTITY:
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
        clientPB.SetActionsMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      const response = new clientPB.EmptyMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        //Checking
        switch (info.getNodeOrProviderCase()) {
          default:
          case clientPB.SetActionsMessage.NodeOrProviderCase
            .NODE_OR_PROVIDER_NOT_SET:
          case clientPB.SetActionsMessage.NodeOrProviderCase.IDENTITY:
            throw new errors.ErrorGRPCInvalidMessage(
              'Node not set for SetActionMessage.',
            );
          case clientPB.SetActionsMessage.NodeOrProviderCase.NODE:
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
        clientPB.SetActionsMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const info = call.request;
      const response = new clientPB.EmptyMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        //Checking
        switch (info.getNodeOrProviderCase()) {
          default:
          case clientPB.SetActionsMessage.NodeOrProviderCase.NODE:
          case clientPB.SetActionsMessage.NodeOrProviderCase
            .NODE_OR_PROVIDER_NOT_SET:
            throw new errors.ErrorGRPCInvalidMessage(
              'Identity not set for SetActionMessage.',
            );
          case clientPB.SetActionsMessage.NodeOrProviderCase.IDENTITY:
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
