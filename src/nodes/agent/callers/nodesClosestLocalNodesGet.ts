import type { HandlerTypes } from '@matrixai/rpc';
import type NodesClosestLocalNodesGet from '../handlers/NodesClosestLocalNodesGet';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesClosestLocalNodesGet>;

const nodesClosestLocalNodesGet = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesClosestLocalNodesGet;
