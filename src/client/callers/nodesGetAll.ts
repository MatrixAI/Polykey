import type { HandlerTypes } from '@matrixai/rpc';
import type NodesGetAll from '../handlers/nodesGetAll';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesGetAll>;

const nodesGetAll = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesGetAll;
