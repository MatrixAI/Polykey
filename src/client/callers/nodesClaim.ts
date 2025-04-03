import type { HandlerTypes } from '@matrixai/rpc';
import type NodesClaim from '../handlers/NodesClaim.js';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesClaim>;

const nodesClaim = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesClaim;
