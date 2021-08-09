import type { NodeId } from '../nodes/types';
import type { SessionManager } from '../session';
import type { NotificationsManager } from '../notifications';

import * as grpc from '@grpc/grpc-js';
import * as utils from './utils';
import * as clientPB from '../proto/js/Client_pb';
import * as grpcUtils from '../grpc/utils';

const createNotificationsRPC = ({
  notificationsManager,
  sessionManager,
}: {
  notificationsManager: NotificationsManager;
  sessionManager: SessionManager;
}) => {
  return {
    notificationsSend: async (
      call: grpc.ServerUnaryCall<
        clientPB.NotificationInfoMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const receivingId = call.request.getReceiverId() as NodeId;
        const message = call.request.getMessage();
        await notificationsManager.sendNotification(receivingId, message);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      const emptyMessage = new clientPB.EmptyMessage();
      callback(null, emptyMessage);
    },
    notificationsRead: async (
      call: grpc.ServerUnaryCall<
        clientPB.NotificationDisplayMessage,
        clientPB.NotificationListMessage
      >,
      callback: grpc.sendUnaryData<clientPB.NotificationListMessage>,
    ): Promise<void> => {
      const response = new clientPB.NotificationListMessage();
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        const unread = call.request.getUnread();

        const numberField = call.request.getNumber();
        let number: number | 'all' | undefined;
        switch (numberField!.getNumberOrAllCase()) {
          default:
          case clientPB.NumberMessage.NumberOrAllCase.NUMBER_OR_ALL_NOT_SET:
            number = undefined;
            break;
          case clientPB.NumberMessage.NumberOrAllCase.NUMBER:
            number = numberField!.getNumber();
            break;
          case clientPB.NumberMessage.NumberOrAllCase.ALL:
            number = 'all';
        }

        const order = call.request.getOrder() as 'newest' | 'oldest';

        const notifications = await notificationsManager.readNotifications({
          unread,
          number,
          order,
        });
        response.setMessages(JSON.stringify(notifications));
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    notificationsClear: async (
      call: grpc.ServerUnaryCall<clientPB.EmptyMessage, clientPB.EmptyMessage>,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      try {
        await utils.verifyToken(call.metadata, sessionManager);
        await notificationsManager.clearNotifications();
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      const emptyMessage = new clientPB.EmptyMessage();
      callback(null, emptyMessage);
    },
  };
};

export default createNotificationsRPC;
