import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { NotificationsManager } from '../../notifications';
import type { NodeId } from '../../nodes/types';
import type * as notificationsPB from '../../proto/js/polykey/v1/notifications/notifications_pb';
import { utils as grpcUtils } from '../../grpc';
import { utils as notificationsUtils } from '../../notifications';
import { validateSync, utils as validationUtils } from '../../validation';
import { matchSync } from '../../utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

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
    try {
      const response = new utilsPB.EmptyMessage();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const {
        nodeId,
      }: {
        nodeId: NodeId;
      } = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['nodeId'], () => validationUtils.parseNodeId(value)],
            () => value,
          );
        },
        {
          nodeId: call.request.getReceiverId(),
        },
      );
      const data = {
        type: 'General',
        message: call.request.getData()?.getMessage(),
      };
      const validatedData =
        notificationsUtils.validateGeneralNotification(data);
      await notificationsManager.sendNotification(nodeId, validatedData);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default notificationsSend;
