import type { HandlerTypes } from '@matrixai/rpc';
import type NotificationsRemove from '../handlers/NotificationsRemove';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NotificationsRemove>;

const notificationsRemove = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default notificationsRemove;
