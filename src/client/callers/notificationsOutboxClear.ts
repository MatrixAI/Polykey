import type { HandlerTypes } from '@matrixai/rpc';
import type NotificationsOutboxClear from '../handlers/NotificationsOutboxClear';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NotificationsOutboxClear>;

const notificationsOutboxClear = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default notificationsOutboxClear;
