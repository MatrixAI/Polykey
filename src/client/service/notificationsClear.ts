import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as clientUtils from '../utils';

function notificationsClear({
  authenticate,
  notificationsManager,
  db,
  logger,
}: {
  authenticate: Authenticate;
  notificationsManager: NotificationsManager;
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
      await db.withTransactionF(async (tran) =>
        notificationsManager.clearNotifications(tran),
      );
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e) &&
        logger.error(`${notificationsClear.name}:${e}`);
      return;
    }
  };
}

export default notificationsClear;
