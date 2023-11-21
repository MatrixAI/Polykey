import type { HandlerTypes } from '@matrixai/rpc';
import type NodesClosestActiveConnectionsGet from '../handlers/NodesClosestActiveConnectionsGet';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesClosestActiveConnectionsGet>;

const nodesClosestActiveConnectionsGet = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesClosestActiveConnectionsGet;
