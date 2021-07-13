import * as utils from './utils';
import * as grpc from '@grpc/grpc-js';
import * as clientErrors from './errors';
import * as grpcUtils from '../grpc/utils';
import * as clientPB from '../proto/js/Client_pb';

import { KeyManager } from '../keys';
import { SessionManager } from '../session';

const createSessionRPC = ({
  sessionManager,
  keyManager,
}: {
  sessionManager: SessionManager;
  keyManager: KeyManager;
}) => {
  return {
    sessionRequestJWT: async (
      call: grpc.ServerUnaryCall<
        clientPB.EmptyMessage,
        clientPB.JWTTokenMessage
      >,
      callback: grpc.sendUnaryData<clientPB.JWTTokenMessage>,
    ): Promise<void> => {
      const response = new clientPB.JWTTokenMessage();
      try {
        const password = await utils.passwordFromMetadata(call.metadata);
        if (!password) {
          throw new clientErrors.ErrorClientPasswordNotProvided();
        }
        await utils.checkPassword(password, keyManager);
        response.setToken(await sessionManager.generateJWTToken());
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, response);
    },
    sessionChangeKey: async (
      call: grpc.ServerUnaryCall<clientPB.EmptyMessage, clientPB.StatusMessage>,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        await sessionManager.refreshKey();
        response.setSuccess(true);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, response);
    },
  };
};

export default createSessionRPC;
