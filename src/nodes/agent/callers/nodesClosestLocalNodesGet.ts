import type NodesClosestLocalNodesGetHandler from '../handlers/NodesClosestLocalNodesGet';
import type { HandlerTypes } from '../../../rpc/types';
import { ServerCaller } from '../../../rpc/callers';

type CallerTypes = HandlerTypes<NodesClosestLocalNodesGetHandler>;

const nodesClosestLocalNodesGet = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesClosestLocalNodesGet;
