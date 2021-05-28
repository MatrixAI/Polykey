import { promisify } from 'util';

import * as grpc from '@grpc/grpc-js';
import * as clientPB from '../proto/js/Client_pb';

import { IdentitiesManager } from '../identities';
import type { IdentityId, ProviderId, TokenData } from '../identities/types';

const createIdentitiesRPC = ({
  identitiesManager,
}: {
  identitiesManager: IdentitiesManager;
}) => {
  return {
    identitiesAuthenticate: async (
      call: grpc.ServerUnaryCall<
        clientPB.ProviderMessage,
        clientPB.ProviderMessage
      >,
      callback: grpc.sendUnaryData<clientPB.ProviderMessage>,
    ): Promise<void> => {
      const response = new clientPB.ProviderMessage();
      try {
        const provider = identitiesManager.getProvider(
          call.request.getId() as ProviderId,
        );
        const authFlow = provider?.authenticate();
        const userCode = (await authFlow?.next())?.value;
        if (typeof userCode != 'string') {
          throw new Error('userCode was not a string');
        }
        // trigger next as a lazy promise so the code can continue
        // after grpc destroys this functions context
        authFlow?.next();
        response.setMessage(userCode);
      } catch (err) {
        callback(err, response);
      }
      callback(null, response);
    },
    tokensPut: async (
      call: grpc.ServerUnaryCall<
        clientPB.TokenSpecificMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new clientPB.EmptyMessage();
      try {
        const provider = call.request.getProvider();
        await identitiesManager.putToken(
          provider?.getId() as ProviderId,
          provider?.getMessage() as IdentityId,
          { accessToken: call.request.getToken() } as TokenData,
        );
      } catch (err) {
        callback(err, response);
      }
      callback(null, response);
    },
    tokensGet: async (
      call: grpc.ServerUnaryCall<
        clientPB.ProviderMessage,
        clientPB.TokenMessage
      >,
      callback: grpc.sendUnaryData<clientPB.TokenMessage>,
    ): Promise<void> => {
      const response = new clientPB.TokenMessage();
      try {
        const tokens = await identitiesManager.getToken(
          call.request.getId() as ProviderId,
          call.request.getMessage() as IdentityId,
        );
        response.setToken(JSON.stringify(tokens));
      } catch (err) {
        callback(err, response);
      }
      callback(null, response);
    },
    tokensDelete: async (
      call: grpc.ServerUnaryCall<
        clientPB.ProviderMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new clientPB.EmptyMessage();
      try {
        await identitiesManager.delToken(
          call.request.getId() as ProviderId,
          call.request.getMessage() as IdentityId,
        );
      } catch (err) {
        callback(err, response);
      }
      callback(null, response);
    },
    providersGet: async (
      call: grpc.ServerUnaryCall<
        clientPB.EmptyMessage,
        clientPB.ProviderMessage
      >,
      callback: grpc.sendUnaryData<clientPB.ProviderMessage>,
    ): Promise<void> => {
      const response = new clientPB.ProviderMessage();
      try {
        const providers = identitiesManager.getProviders();
        response.setId(JSON.stringify(providers));
      } catch (err) {
        callback(err, response);
      }
      callback(null, response);
    },
  };
};

export default createIdentitiesRPC;
