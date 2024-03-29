import type { HandlerTypes } from '@matrixai/rpc';
import type NotificationsRead from '../handlers/NotificationsRead';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NotificationsRead>;

const notificationsRead = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default notificationsRead;
