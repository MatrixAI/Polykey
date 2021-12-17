import type * as utils from './utils';
import type { NodeManager } from '../nodes';
import type { Sigchain } from '../sigchain';
import type { IdentitiesManager } from '../identities';
import type { IdentityId, ProviderId, TokenData } from '../identities/types';
import type * as grpc from '@grpc/grpc-js';
import * as clientErrors from './errors';
import * as claimsUtils from '../claims/utils';
import * as grpcUtils from '../grpc/utils';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import * as identitiesPB from '../proto/js/polykey/v1/identities/identities_pb';
import * as identitiesErrors from '../identities/errors';
import { never } from '../utils';

const createIdentitiesRPC = ({
  identitiesManager,
  sigchain,
  nodeManager,
  authenticate,
}: {
  identitiesManager: IdentitiesManager;
  sigchain: Sigchain;
  nodeManager: NodeManager;
  authenticate: utils.Authenticate;
}) => {
  return {
    identitiesAuthenticate: async (
      call: grpc.ServerWritableStream<
        identitiesPB.Provider,
        identitiesPB.AuthenticationProcess
      >,
    ): Promise<void> => {
      const genWritable = grpcUtils.generatorWritable(call);
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);
        const provider = identitiesManager.getProvider(
          call.request.getProviderId() as ProviderId,
        );
        if (provider == null) {
          throw new clientErrors.ErrorClientInvalidProvider();
        }
        const authFlow = provider.authenticate();
        let authFlowResult = await authFlow.next();
        if (authFlowResult.done) {
          never();
        }
        const authProcess = new identitiesPB.AuthenticationProcess();
        const authRequest = new identitiesPB.AuthenticationRequest();
        authRequest.setUrl(authFlowResult.value.url);
        const map = authRequest.getDataMap();
        for (const [k, v] of Object.entries(authFlowResult.value.data)) {
          map.set(k, v);
        }
        authProcess.setRequest(authRequest);
        await genWritable.next(authProcess);
        authFlowResult = await authFlow.next();
        if (!authFlowResult.done) {
          never();
        }
        const authResponse = new identitiesPB.AuthenticationResponse();
        authResponse.setIdentityId(authFlowResult.value);
        authProcess.setResponse(authResponse);
        await genWritable.next(authProcess);
        await genWritable.next(null);
        return;
      } catch (e) {
        await genWritable.throw(e);
        return;
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
          provider?.getIdentityId() as IdentityId,
          { accessToken: call.request.getToken() } as TokenData,
        );
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
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
          call.request.getIdentityId() as IdentityId,
        );
        response.setToken(JSON.stringify(tokens));
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
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
          call.request.getIdentityId() as IdentityId,
        );
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
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
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
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
          ?.getIdentityId() as IdentityId;
        const provider = identitiesManager.getProvider(providerId);
        if (provider == null)
          throw new clientErrors.ErrorClientInvalidProvider();

        const identities = provider.getConnectedIdentityDatas(
          identityId,
          call.request.getSearchTermList(),
        );

        for await (const identity of identities) {
          const identityInfoMessage = new identitiesPB.Info();
          const providerMessage = new identitiesPB.Provider();
          providerMessage.setProviderId(identity.providerId);
          providerMessage.setIdentityId(identity.identityId);
          identityInfoMessage.setProvider(providerMessage);
          identityInfoMessage.setName(identity.name ?? '');
          identityInfoMessage.setEmail(identity.email ?? '');
          identityInfoMessage.setUrl(identity.url ?? '');
          await genWritable.next(identityInfoMessage);
        }
        await genWritable.next(null);
        return;
      } catch (err) {
        await genWritable.throw(err);
        return;
      }
    },
    /**
     * Gets the first identityId of the local keynode.
     */
    identitiesInfoGet: async (
      call: grpc.ServerUnaryCall<identitiesPB.Provider, identitiesPB.Provider>,
      callback: grpc.sendUnaryData<identitiesPB.Provider>,
    ): Promise<void> => {
      const response = new identitiesPB.Provider();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);
        // Get's an identity out of all identities.
        const providerId = call.request.getProviderId() as ProviderId;
        const provider = identitiesManager.getProvider(providerId);
        if (provider !== undefined) {
          const identities = await provider.getAuthIdentityIds();
          response.setProviderId(providerId);
          if (identities.length !== 0) {
            response.setIdentityId(identities[0]);
          }
        }
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
    },
    /**
     * Augments the keynode with a new identity.
     */
    identitiesClaim: async (
      call: grpc.ServerUnaryCall<identitiesPB.Provider, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new utilsPB.EmptyMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);
        // Check provider is authenticated
        const providerId = call.request.getProviderId() as ProviderId;
        const provider = identitiesManager.getProvider(providerId);
        if (provider == null)
          throw new clientErrors.ErrorClientInvalidProvider();
        const identityId = call.request.getIdentityId() as IdentityId;
        const identities = await provider.getAuthIdentityIds();
        if (!identities.includes(identityId)) {
          throw new identitiesErrors.ErrorProviderUnauthenticated();
        }
        // Create identity claim on our node
        const claim = await sigchain.addClaim({
          type: 'identity',
          node: nodeManager.getNodeId(),
          provider: providerId,
          identity: identityId,
        });
        // Publish claim on identity
        const claimDecoded = claimsUtils.decodeClaim(claim);
        await provider.publishClaim(identityId, claimDecoded);
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
    },
  };
};

export default createIdentitiesRPC;
