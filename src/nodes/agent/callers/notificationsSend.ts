import type NotificationsSendHandler from '../handlers/NotificationsSend';
import type { HandlerTypes } from '@matrixai/rpc';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NotificationsSendHandler>;

const notificationsSend = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default notificationsSend;
