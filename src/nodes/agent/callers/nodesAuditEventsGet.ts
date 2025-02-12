import type { HandlerTypes } from '@matrixai/rpc';
import type NodesAuditEventsGet from '../handlers/NodesAuditEventsGet';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesAuditEventsGet>;

const nodesAuditEventsGet = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesAuditEventsGet;
