import type NodesClaimsGetHandler from '../handlers/NodesClaimsGet';
import type { HandlerTypes } from '@matrixai/rpc';
import { callers } from '@matrixai/rpc';

const ServerCaller = callers.ServerCaller;
type CallerTypes = HandlerTypes<NodesClaimsGetHandler>;

const nodesClaimsGet = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesClaimsGet;
