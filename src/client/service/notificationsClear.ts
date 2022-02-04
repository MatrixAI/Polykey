import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { NotificationsManager } from '../../notifications';
import { utils as grpcUtils } from '../../grpc';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function notificationsClear({
  notificationsManager,
  authenticate,
}: {
  notificationsManager: NotificationsManager;
  authenticate: Authenticate;
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
      return;
    }
  };
}

export default notificationsClear;
