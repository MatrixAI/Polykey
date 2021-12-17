import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { NotificationsManager } from '../../notifications';
import { utils as grpcUtils } from '../../grpc';
import { utils as nodesUtils }  from '../../nodes';
import { utils as notificationsUtils } from '../../notifications';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as notificationsPB from '../../proto/js/polykey/v1/notifications/notifications_pb';

function notificationsSend({
  notificationsManager,
  authenticate,
}: {
  notificationsManager: NotificationsManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<notificationsPB.Send, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    const response = new utilsPB.EmptyMessage();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const receivingId = nodesUtils.makeNodeId(call.request.getReceiverId());
      const data = {
        type: 'General',
        message: call.request.getData()?.getMessage(),
      };
      const validatedData =
        notificationsUtils.validateGeneralNotification(data);
      await notificationsManager.sendNotification(receivingId, validatedData);
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default notificationsSend;
