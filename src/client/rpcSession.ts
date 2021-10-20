import type { KeyManager } from '../keys';
import type { SessionManager } from '../sessions';

import * as utils from './utils';
import * as grpc from '@grpc/grpc-js';
import * as clientErrors from './errors';
import * as grpcUtils from '../grpc/utils';
import { messages } from '.';
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
        messages.sessions.Password,
        messages.sessions.Token
      >,
      callback: grpc.sendUnaryData<messages.sessions.Token>,
    ): Promise<void> => {
      const response = new messages.sessions.Token();
      try {
        const password = await sessionUtils.passwordFromPasswordMessage(
          call.request,
        );
        if (password == null) {
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
        messages.EmptyMessage,
        messages.sessions.Token
      >,
      callback: grpc.sendUnaryData<messages.sessions.Token>,
    ): Promise<void> => {
      const response = new messages.sessions.Token();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        response.setToken(await sessionManager.generateToken());
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, response);
    },
    sessionLockAll: async (
      call: grpc.ServerUnaryCall<messages.EmptyMessage, messages.StatusMessage>,
      callback: grpc.sendUnaryData<messages.StatusMessage>,
    ): Promise<void> => {
      const response = new messages.StatusMessage();
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
