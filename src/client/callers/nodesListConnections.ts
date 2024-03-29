import type { HandlerTypes } from '@matrixai/rpc';
import type NodesListConnections from '../handlers/NodesListConnections';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesListConnections>;

const nodesListConnections = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesListConnections;
