import type { HandlerTypes } from '@matrixai/rpc';
import type NodesFind from '../handlers/NodesFind';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesFind>;

const nodesFind = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesFind;
