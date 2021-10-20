import type { SessionManager } from '../sessions';
import type { NotificationsManager } from '../notifications';

import * as grpc from '@grpc/grpc-js';
import * as utils from './utils';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import * as notificationsPB from '../proto/js/polykey/v1/notifications/notifications_pb';
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
      call: grpc.ServerUnaryCall<notificationsPB.Send, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
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
      const emptyMessage = new utilsPB.EmptyMessage();
      callback(null, emptyMessage);
    },
    notificationsRead: async (
      call: grpc.ServerUnaryCall<notificationsPB.Read, notificationsPB.List>,
      callback: grpc.sendUnaryData<notificationsPB.List>,
    ): Promise<void> => {
      const response = new notificationsPB.List();
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

        const notifMessages: Array<notificationsPB.Notification> = [];
        for (const notif of notifications) {
          const notificationsMessage = new notificationsPB.Notification();
          switch (notif.data.type) {
            case 'General': {
              const generalMessage = new notificationsPB.General();
              generalMessage.setMessage(notif.data.message);
              notificationsMessage.setGeneral(generalMessage);
              break;
            }
            case 'GestaltInvite': {
              notificationsMessage.setGestaltInvite('GestaltInvite');
              break;
            }
            case 'VaultShare': {
              const vaultShareMessage = new notificationsPB.Share();
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
      call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, utilsPB.EmptyMessage>,
      callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
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
      const emptyMessage = new utilsPB.EmptyMessage();
      callback(null, emptyMessage);
    },
  };
};

export default createNotificationsRPC;
