import type { HandlerTypes } from '@matrixai/rpc';
import type NotificationsOutboxRemove from '../handlers/NotificationsOutboxRemove';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NotificationsOutboxRemove>;

const notificationsOutboxRemove = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default notificationsOutboxRemove;
