import type { KeyManager } from '../keys';
import type { SessionManager } from '../sessions';

import * as utils from './utils';
import * as grpc from '@grpc/grpc-js';
import * as clientErrors from './errors';
import * as grpcUtils from '../grpc/utils';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import * as sessionsPB from '../proto/js/polykey/v1/sessions/sessions_pb';
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
      call: grpc.ServerUnaryCall<sessionsPB.Password, sessionsPB.Token>,
      callback: grpc.sendUnaryData<sessionsPB.Token>,
    ): Promise<void> => {
      const response = new sessionsPB.Token();
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
      call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, sessionsPB.Token>,
      callback: grpc.sendUnaryData<sessionsPB.Token>,
    ): Promise<void> => {
      const response = new sessionsPB.Token();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        response.setToken(await sessionManager.generateToken());
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, response);
    },
    sessionLockAll: async (
      call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, utilsPB.StatusMessage>,
      callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
    ): Promise<void> => {
      const response = new utilsPB.StatusMessage();
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
