import type NodesClaimsGetHandler from '../handlers/NodesClaimsGet';
import type { HandlerTypes } from '../../../rpc/types';
import { ServerCaller } from '@matrixai/rpc/dist/callers';

type CallerTypes = HandlerTypes<NodesClaimsGetHandler>;

const nodesClaimsGet = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesClaimsGet;
