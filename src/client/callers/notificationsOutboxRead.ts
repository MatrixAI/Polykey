import type { HandlerTypes } from '@matrixai/rpc';
import type NotificationsOutboxRead from '../handlers/NotificationsOutboxRead';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NotificationsOutboxRead>;

const notificationsOutboxRead = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default notificationsOutboxRead;
