import type { HandlerTypes } from '@matrixai/rpc';
import type NotificationsInboxRead from '../handlers/NotificationsInboxRead';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NotificationsInboxRead>;

const notificationsInboxRead = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default notificationsInboxRead;
