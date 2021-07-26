import type { KeyManager } from '../keys';
import type { SessionManager } from '../sessions';

import * as utils from './utils';
import * as grpc from '@grpc/grpc-js';
import * as clientErrors from './errors';
import * as grpcUtils from '../grpc/utils';
import * as clientPB from '../proto/js/Client_pb';
import * as sessionUtils from '../sessions/utils';

const createSessionRPC = ({
  sessionManager,
  keyManager,
}: {
  sessionManager: SessionManager;
  keyManager: KeyManager;
}) => {
  return {
    sessionUnlock: async (
      call: grpc.ServerUnaryCall<
        clientPB.EmptyMessage,
        clientPB.SessionTokenMessage
      >,
      callback: grpc.sendUnaryData<clientPB.SessionTokenMessage>,
    ): Promise<void> => {
      const response = new clientPB.SessionTokenMessage();
      try {
        const password = await sessionUtils.passwordFromMetadata(call.metadata);
        if (!password) {
          throw new clientErrors.ErrorClientPasswordNotProvided();
        }
        await sessionUtils.checkPassword(password, keyManager);
        response.setToken(await sessionManager.generateToken());
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, response);
    },
    sessionRefresh: async (
      call: grpc.ServerUnaryCall<
        clientPB.EmptyMessage,
        clientPB.SessionTokenMessage
      >,
      callback: grpc.sendUnaryData<clientPB.SessionTokenMessage>,
    ): Promise<void> => {
      const response = new clientPB.SessionTokenMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        response.setToken(await sessionManager.generateToken());
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, response);
    },
    sessionLockAll: async (
      call: grpc.ServerUnaryCall<clientPB.EmptyMessage, clientPB.StatusMessage>,
      callback: grpc.sendUnaryData<clientPB.StatusMessage>,
    ): Promise<void> => {
      const response = new clientPB.StatusMessage();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
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
