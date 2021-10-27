import type { NodeManager } from '../nodes';
import type { NodeInfo } from '../nodes/types';
import type { GestaltGraph } from '../gestalts';
import type { SessionManager } from '../sessions';
import type { IdentitiesManager } from '../identities';
import type {
  IdentityId,
  ProviderId,
  TokenData,
  IdentityInfo,
} from '../identities/types';

import * as utils from './utils';
import * as errors from '../errors';
import * as grpc from '@grpc/grpc-js';
import * as grpcUtils from '../grpc/utils';
import { messages } from '../client';

const createIdentitiesRPC = ({
  identitiesManager,
  nodeManager,
  gestaltGraph,
  sessionManager,
}: {
  identitiesManager: IdentitiesManager;
  nodeManager: NodeManager;
  gestaltGraph: GestaltGraph;
  sessionManager: SessionManager;
}) => {
  return {
    identitiesAuthenticate: async (
      call: grpc.ServerWritableStream<
        messages.identities.Provider,
        messages.identities.Provider
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      const response = new messages.identities.Provider();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const provider = identitiesManager.getProvider(
          call.request.getProviderId() as ProviderId,
        );
        const authFlow = provider?.authenticate();
        const userCode = (await authFlow?.next())?.value;
        if (typeof userCode !== 'string') {
          throw new errors.ErrorProviderAuthentication(
            'userCode was not a string',
          );
        }
        response.setMessage(userCode);
        await genWritable.next(response);

        //Wait to finish.
        const userName = (await authFlow?.next())?.value;
        if (userName == null)
          throw new errors.ErrorProviderAuthentication(
            'Failed to authenticate.',
          );
        response.setMessage(userName);
        await genWritable.next(response);
        await genWritable.next(null);
      } catch (err) {
        await genWritable.throw(err);
      }
    },
    identitiesTokenPut: async (
      call: grpc.ServerUnaryCall<
        messages.identities.TokenSpecific,
        messages.common.EmptyMessage
      >,
      callback: grpc.sendUnaryData<messages.common.EmptyMessage>,
    ): Promise<void> => {
      const response = new messages.common.EmptyMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const provider = call.request.getProvider();
        await identitiesManager.putToken(
          provider?.getProviderId() as ProviderId,
          provider?.getMessage() as IdentityId,
          { accessToken: call.request.getToken() } as TokenData,
        );
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    identitiesTokenGet: async (
      call: grpc.ServerUnaryCall<
        messages.identities.Provider,
        messages.identities.Token
      >,
      callback: grpc.sendUnaryData<messages.identities.Token>,
    ): Promise<void> => {
      const response = new messages.identities.Token();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const tokens = await identitiesManager.getToken(
          call.request.getProviderId() as ProviderId,
          call.request.getMessage() as IdentityId,
        );
        response.setToken(JSON.stringify(tokens));
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    identitiesTokenDelete: async (
      call: grpc.ServerUnaryCall<
        messages.identities.Provider,
        messages.common.EmptyMessage
      >,
      callback: grpc.sendUnaryData<messages.common.EmptyMessage>,
    ): Promise<void> => {
      const response = new messages.common.EmptyMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        await identitiesManager.delToken(
          call.request.getProviderId() as ProviderId,
          call.request.getMessage() as IdentityId,
        );
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    identitiesProvidersList: async (
      call: grpc.ServerUnaryCall<
        messages.common.EmptyMessage,
        messages.identities.Provider
      >,
      callback: grpc.sendUnaryData<messages.identities.Provider>,
    ): Promise<void> => {
      const response = new messages.identities.Provider();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const providers = identitiesManager.getProviders();
        response.setProviderId(JSON.stringify(Object.keys(providers)));
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    identitiesInfoGetConnected: async (
      call: grpc.ServerWritableStream<
        messages.identities.ProviderSearch,
        messages.identities.Info
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const providerId = call.request
          .getProvider()
          ?.getProviderId() as ProviderId;
        const identityId = call.request
          .getProvider()
          ?.getMessage() as IdentityId;
        const provider = identitiesManager.getProvider(providerId);
        if (provider == null)
          throw Error(
            `Provider id: ${providerId} is invalid or provider doesn't exist.`,
          );

        const identities = provider.getConnectedIdentityDatas(
          identityId,
          call.request.getSearchTermList(),
        );

        for await (const identity of identities) {
          const identityInfoMessage = new messages.identities.Info();
          const providerMessage = new messages.identities.Provider();
          providerMessage.setProviderId(identity.providerId);
          providerMessage.setMessage(identity.identityId);
          identityInfoMessage.setProvider(providerMessage);
          identityInfoMessage.setName(identity.name ?? '');
          identityInfoMessage.setEmail(identity.email ?? '');
          identityInfoMessage.setUrl(identity.url ?? '');
          await genWritable.next(identityInfoMessage);
        }
        await genWritable.next(null);
      } catch (err) {
        await genWritable.throw(err);
      }
    },
    /**
     * Gets the first identityId of the local keynode.
     */
    identitiesInfoGet: async (
      call: grpc.ServerUnaryCall<
        messages.identities.Provider,
        messages.identities.Provider
      >,
      callback: grpc.sendUnaryData<messages.identities.Provider>,
    ): Promise<void> => {
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        // Get's an identity out of all identities.
        const providerMessage = new messages.identities.Provider();
        const providerId = call.request.getProviderId() as ProviderId;
        const provider = identitiesManager.getProvider(providerId);
        if (provider == null) throw Error(`Invalid provider: ${providerId}`);
        const identities = await provider.getAuthIdentityIds();
        if (identities.length !== 0) {
          providerMessage.setProviderId(providerId);
          providerMessage.setMessage(identities[0]);
        } else throw Error(`No identities found for provider: ${providerId}`);
        callback(null, providerMessage);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
    /**
     * Augments the keynode with a new identity.
     */
    identitiesClaim: async (
      call: grpc.ServerUnaryCall<
        messages.identities.Provider,
        messages.common.EmptyMessage
      >,
      callback: grpc.sendUnaryData<messages.common.EmptyMessage>,
    ): Promise<void> => {
      // To augment a keynode we need a provider, generate an oauthkey and then
      const info = call.request;
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const nodeId = nodeManager.getNodeId(); //Getting the local node ID.

        //Do the deed...
        const nodeInfo: NodeInfo = {
          id: nodeId,
          chain: {},
        };
        const identityInfo: IdentityInfo = {
          providerId: info.getProviderId() as ProviderId,
          identityId: info.getMessage() as IdentityId,
          claims: {},
        };
        await gestaltGraph.linkNodeAndIdentity(nodeInfo, identityInfo); //Need to call this
        // it takes NodeInfo and IdentityInfo.
        // Getting and creating NodeInfo is blocked by
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      const emptyMessage = new messages.common.EmptyMessage();
      callback(null, emptyMessage);
    },
  };
};

export default createIdentitiesRPC;
