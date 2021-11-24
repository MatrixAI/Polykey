import type { NodeManager } from '../nodes';
import type { NodeInfo } from '../nodes/types';
import type { GestaltGraph } from '../gestalts';
import type { IdentitiesManager } from '../identities';
import type {
  IdentityId,
  ProviderId,
  TokenData,
  IdentityInfo,
} from '../identities/types';

import type * as grpc from '@grpc/grpc-js';
import type * as utils from './utils';
import * as errors from '../errors';
import * as grpcUtils from '../grpc/utils';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import * as identitiesPB from '../proto/js/polykey/v1/identities/identities_pb';

const createIdentitiesRPC = ({
  identitiesManager,
  nodeManager,
  gestaltGraph,
  authenticate,
}: {
  identitiesManager: IdentitiesManager;
  nodeManager: NodeManager;
  gestaltGraph: GestaltGraph;
  authenticate: utils.Authenticate;
}) => {
  return {
    identitiesAuthenticate: async (
      call: grpc.ServerWritableStream<
        identitiesPB.Provider,
        identitiesPB.Provider
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      const response = new identitiesPB.Provider();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

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

        // Wait to finish.
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
        identitiesPB.TokenSpecific,
        utilsPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new utilsPB.EmptyMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

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
      call: grpc.ServerUnaryCall<identitiesPB.Provider, identitiesPB.Token>,
      callback: grpc.sendUnaryData<identitiesPB.Token>,
    ): Promise<void> => {
      const response = new identitiesPB.Token();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

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
      call: grpc.ServerUnaryCall<identitiesPB.Provider, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new utilsPB.EmptyMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

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
      call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, identitiesPB.Provider>,
      callback: grpc.sendUnaryData<identitiesPB.Provider>,
    ): Promise<void> => {
      const response = new identitiesPB.Provider();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const providers = identitiesManager.getProviders();
        response.setProviderId(JSON.stringify(Object.keys(providers)));
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    identitiesInfoGetConnected: async (
      call: grpc.ServerWritableStream<
        identitiesPB.ProviderSearch,
        identitiesPB.Info
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

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
          const identityInfoMessage = new identitiesPB.Info();
          const providerMessage = new identitiesPB.Provider();
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
      call: grpc.ServerUnaryCall<identitiesPB.Provider, identitiesPB.Provider>,
      callback: grpc.sendUnaryData<identitiesPB.Provider>,
    ): Promise<void> => {
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);
        // Get's an identity out of all identities.
        const providerMessage = new identitiesPB.Provider();
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
      call: grpc.ServerUnaryCall<identitiesPB.Provider, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
    ): Promise<void> => {
      // To augment a keynode we need a provider, generate an oauthkey and then
      const info = call.request;
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);

        const nodeId = nodeManager.getNodeId(); // Getting the local node ID.

        // Do the deed...
        const nodeInfo: NodeInfo = {
          id: nodeId,
          chain: {},
        };
        const identityInfo: IdentityInfo = {
          providerId: info.getProviderId() as ProviderId,
          identityId: info.getMessage() as IdentityId,
          claims: {},
        };
        await gestaltGraph.linkNodeAndIdentity(nodeInfo, identityInfo); // Need to call this
        // it takes NodeInfo and IdentityInfo.
        // Getting and creating NodeInfo is blocked by
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      const emptyMessage = new utilsPB.EmptyMessage();
      callback(null, emptyMessage);
    },
  };
};

export default createIdentitiesRPC;
