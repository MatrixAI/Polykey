import type { NodeId } from '../nodes/types';
import type { SessionManager } from '../sessions';
import type { NotificationsManager } from '../notifications';

import * as grpc from '@grpc/grpc-js';
import * as utils from './utils';
import * as clientPB from '../proto/js/Client_pb';
import * as grpcUtils from '../grpc/utils';
import * as notificationsUtils from '../notifications/utils';

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
        clientPB.NotificationsSendMessage,
        clientPB.EmptyMessage
      >,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
    ): Promise<void> => {
      try {
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        const receivingId = call.request.getReceiverId() as NodeId;
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
      const emptyMessage = new clientPB.EmptyMessage();
      callback(null, emptyMessage);
    },
    notificationsRead: async (
      call: grpc.ServerUnaryCall<
        clientPB.NotificationsReadMessage,
        clientPB.NotificationsListMessage
      >,
      callback: grpc.sendUnaryData<clientPB.NotificationsListMessage>,
    ): Promise<void> => {
      const response = new clientPB.NotificationsListMessage();
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

        const notifMessages: Array<clientPB.NotificationsMessage> = [];
        for (const notif of notifications) {
          const notificationsMessage = new clientPB.NotificationsMessage();
          switch (notif.data.type) {
            case 'General': {
              const generalMessage = new clientPB.GeneralTypeMessage();
              generalMessage.setMessage(notif.data.message);
              notificationsMessage.setGeneral(generalMessage);
              break;
            }
            case 'GestaltInvite': {
              notificationsMessage.setGestaltInvite('GestaltInvite');
              break;
            }
            case 'VaultShare': {
              const vaultShareMessage = new clientPB.VaultShareTypeMessage();
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
      call: grpc.ServerUnaryCall<clientPB.EmptyMessage, clientPB.EmptyMessage>,
      callback: grpc.sendUnaryData<clientPB.EmptyMessage>,
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
      const emptyMessage = new clientPB.EmptyMessage();
      callback(null, emptyMessage);
    },
  };
};

export default createNotificationsRPC;
