import type { HandlerTypes } from '@matrixai/rpc';
import type NodesClaimsGet from '../handlers/NodesClaimsGet';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesClaimsGet>;

const nodesClaimsGet = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesClaimsGet;
