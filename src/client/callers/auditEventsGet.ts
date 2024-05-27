import type { HandlerTypes } from '@matrixai/rpc';
import type AuditEventsGet from '../handlers/AuditEventsGet';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<AuditEventsGet>;

const auditEventsGet = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default auditEventsGet;
