import type { HandlerTypes } from '@matrixai/rpc';
import type NodesCrossSignClaim from '../handlers/NodesCrossSignClaim';
import { DuplexCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesCrossSignClaim>;

const nodesCrossSignClaim = new DuplexCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesCrossSignClaim;
