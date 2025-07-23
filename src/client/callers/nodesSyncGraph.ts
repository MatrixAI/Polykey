import type { HandlerTypes } from '@matrixai/rpc';
import type NodesSyncGraph from '../handlers/NodesSyncGraph.js';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesSyncGraph>;

const nodesSyncGraph = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesSyncGraph;
