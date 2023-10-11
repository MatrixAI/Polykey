import type { HandlerTypes } from '@matrixai/rpc';
import type NodesPing from '../handlers/nodesPing';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesPing>;

const nodesPing = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesPing;
