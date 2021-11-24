import type { SessionManager } from '../sessions';
import type { KeyManager } from '../keys';

import type * as grpc from '@grpc/grpc-js';
import type * as utils from './utils';
import * as clientUtils from '../client/utils';
import * as grpcUtils from '../grpc/utils';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import * as sessionsPB from '../proto/js/polykey/v1/sessions/sessions_pb';

const createSessionsRPC = ({
  authenticate,
  sessionManager,
  keyManager,
}: {
  authenticate: utils.Authenticate;
  sessionManager: SessionManager;
  keyManager: KeyManager;
}) => {
  return {
    sessionsUnlock: async (
      call: grpc.ServerUnaryCall<sessionsPB.Password, sessionsPB.Token>,
      callback: grpc.sendUnaryData<sessionsPB.Token>,
    ): Promise<void> => {
      const response = new sessionsPB.Token();
      try {
        const password = call.request.getPassword();
        await keyManager.checkPassword(password);
        const token = await sessionManager.createToken();
        response.setToken(token);
        call.sendMetadata(clientUtils.encodeAuthFromSession(token));
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, response);
    },
    sessionsRefresh: async (
      call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, sessionsPB.Token>,
      callback: grpc.sendUnaryData<sessionsPB.Token>,
    ): Promise<void> => {
      const response = new sessionsPB.Token();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);
        response.setToken(await sessionManager.createToken());
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, response);
    },
    sessionsLockAll: async (
      call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, utilsPB.StatusMessage>,
      callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
    ): Promise<void> => {
      const response = new utilsPB.StatusMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);
        await sessionManager.resetKey();
        response.setSuccess(true);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      callback(null, response);
    },
  };
};

export default createSessionsRPC;
