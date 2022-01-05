import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { SessionManager } from '../../sessions';
import * as grpcUtils from '../../grpc/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function agentLockAll({
  sessionManager,
  authenticate,
}: {
  sessionManager: SessionManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    const response = new utilsPB.EmptyMessage();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      await sessionManager.resetKey();
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default agentLockAll;
