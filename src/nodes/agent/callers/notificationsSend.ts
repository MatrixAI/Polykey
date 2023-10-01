import type NotificationsSendHandler from '../handlers/NotificationsSend';
import type { HandlerTypes } from '../../../rpc/types';
import { UnaryCaller } from '../../../rpc/callers';

type CallerTypes = HandlerTypes<NotificationsSendHandler>;

const notificationsSend = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default notificationsSend;
