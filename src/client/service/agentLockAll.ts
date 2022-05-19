import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type { SessionManager } from '../../sessions';
import type Logger from '@matrixai/logger';
import { withF } from '@matrixai/resources';
import * as grpcUtils from '../../grpc/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function agentLockAll({
  authenticate,
  sessionManager,
  db,
  logger,
}: {
  authenticate: Authenticate;
  sessionManager: SessionManager;
  db: DB;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.EmptyMessage();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      await db.withTransactionF(
        async (tran) => await sessionManager.resetKey(tran),
      );
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      logger.error(e);
      return;
    }
  };
}

export default agentLockAll;
