import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { NotificationsManager } from '../../notifications';
import type Logger from '@matrixai/logger';
import { utils as grpcUtils } from '../../grpc';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function notificationsClear({
  authenticate,
  notificationsManager,
  logger,
}: {
  authenticate: Authenticate;
  notificationsManager: NotificationsManager;
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
      await notificationsManager.clearNotifications();
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      logger.error(e);
      return;
    }
  };
}

export default notificationsClear;
