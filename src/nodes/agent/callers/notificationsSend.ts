import type { HandlerTypes } from '@matrixai/rpc';
import type NotificationsSend from '../handlers/NotificationsSend';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NotificationsSend>;

const notificationsSend = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default notificationsSend;
