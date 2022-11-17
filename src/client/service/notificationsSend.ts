import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type NotificationsManager from '../../notifications/NotificationsManager';
import type { NodeId } from '../../ids/types';
import type * as notificationsPB from '../../proto/js/polykey/v1/notifications/notifications_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import * as nodesErrors from '../../nodes/errors';
import { matchSync } from '../../utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as clientUtils from '../utils';
import { General } from '../../notifications/types';

function notificationsSend({
  authenticate,
  notificationsManager,
  logger,
}: {
  authenticate: Authenticate;
  notificationsManager: NotificationsManager;
  logger: Logger;
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
      const data: General = {
        type: 'General',
        message: call.request.getData()!.getMessage(),
      };
      await notificationsManager.sendNotification(nodeId, data);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e, [
        nodesErrors.ErrorNodeGraphNodeIdNotFound,
      ]) && logger.error(`${notificationsSend.name}:${e}`);
      return;
    }
  };
}

export default notificationsSend;
