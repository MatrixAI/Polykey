import type { HandlerTypes } from '@matrixai/rpc';
import type NotificationsInboxClear from '../handlers/NotificationsInboxClear';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NotificationsInboxClear>;

const notificationsInboxClear = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default notificationsInboxClear;
