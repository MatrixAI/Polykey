import type { SessionManager } from '../sessions';
import type { NotificationsManager } from '../notifications';

import * as grpc from '@grpc/grpc-js';
import * as utils from './utils';
import { messages } from '.';
import * as grpcUtils from '../grpc/utils';
import * as notificationsUtils from '../notifications/utils';
import { makeNodeId } from '../nodes/utils';

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
        messages.notifications.Send,
        messages.EmptyMessage
      >,
      callback: grpc.sendUnaryData<messages.EmptyMessage>,
    ): Promise<void> => {
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const receivingId = makeNodeId(call.request.getReceiverId());
        const data = {
          type: 'General',
          message: call.request.getData()?.getMessage(),
        };
        const validatedData =
          notificationsUtils.validateGeneralNotification(data);
        await notificationsManager.sendNotification(receivingId, validatedData);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      const emptyMessage = new messages.EmptyMessage();
      callback(null, emptyMessage);
    },
    notificationsRead: async (
      call: grpc.ServerUnaryCall<
        messages.notifications.Read,
        messages.notifications.List
      >,
      callback: grpc.sendUnaryData<messages.notifications.List>,
    ): Promise<void> => {
      const response = new messages.notifications.List();
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const unread = call.request.getUnread();
        const order = call.request.getOrder() as 'newest' | 'oldest';
        const numberField = call.request.getNumber();
        let number: number | 'all';
        if (numberField === 'all') {
          number = numberField;
        } else {
          number = parseInt(numberField);
        }

        const notifications = await notificationsManager.readNotifications({
          unread,
          number,
          order,
        });

        const notifMessages: Array<messages.notifications.Notification> = [];
        for (const notif of notifications) {
          const notificationsMessage =
            new messages.notifications.Notification();
          switch (notif.data.type) {
            case 'General': {
              const generalMessage = new messages.notifications.General();
              generalMessage.setMessage(notif.data.message);
              notificationsMessage.setGeneral(generalMessage);
              break;
            }
            case 'GestaltInvite': {
              notificationsMessage.setGestaltInvite('GestaltInvite');
              break;
            }
            case 'VaultShare': {
              const vaultShareMessage = new messages.notifications.Share();
              vaultShareMessage.setVaultId(notif.data.vaultId);
              vaultShareMessage.setVaultName(notif.data.vaultName);
              vaultShareMessage.setActionsList(Object.keys(notif.data.actions));
              notificationsMessage.setVaultShare(vaultShareMessage);
              break;
            }
          }
          notificationsMessage.setSenderId(notif.senderId);
          notificationsMessage.setIsRead(notif.isRead);
          notifMessages.push(notificationsMessage);
        }
        response.setNotificationList(notifMessages);
      } catch (err) {
        callback(grpcUtils.fromError(err), response);
      }
      callback(null, response);
    },
    notificationsClear: async (
      call: grpc.ServerUnaryCall<messages.EmptyMessage, messages.EmptyMessage>,
      callback: grpc.sendUnaryData<messages.EmptyMessage>,
    ): Promise<void> => {
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        await notificationsManager.clearNotifications();
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
      const emptyMessage = new messages.EmptyMessage();
      callback(null, emptyMessage);
    },
  };
};

export default createNotificationsRPC;
