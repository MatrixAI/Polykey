import type NodesClosestLocalNodesGetHandler from '../handlers/NodesClosestLocalNodesGet';
import type { HandlerTypes } from '@matrixai/rpc';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesClosestLocalNodesGetHandler>;

const nodesClosestLocalNodesGet = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesClosestLocalNodesGet;
