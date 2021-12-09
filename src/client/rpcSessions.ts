import type { SessionManager } from '../sessions';
import type * as grpc from '@grpc/grpc-js';
import type * as utils from './utils';
import * as grpcUtils from '../grpc/utils';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';

const createSessionsRPC = ({
  authenticate,
  sessionManager,
}: {
  authenticate: utils.Authenticate;
  sessionManager: SessionManager;
}) => {
  return {
    sessionsUnlock: async (
      call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new utilsPB.EmptyMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);
        return callback(null, response);
      } catch (e) {
        return callback(grpcUtils.fromError(e), null);
      }
    },
    sessionsLockAll: async (
      call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
    ): Promise<void> => {
      const response = new utilsPB.EmptyMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);
        await sessionManager.resetKey();
        return callback(null, response);
      } catch (err) {
        return callback(grpcUtils.fromError(err), null);
      }
    },
  };
};

export default createSessionsRPC;
