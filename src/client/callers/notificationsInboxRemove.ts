import type { HandlerTypes } from '@matrixai/rpc';
import type NotificationsInboxRemove from '../handlers/NotificationsInboxRemove';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NotificationsInboxRemove>;

const notificationsInboxRemove = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default notificationsInboxRemove;
