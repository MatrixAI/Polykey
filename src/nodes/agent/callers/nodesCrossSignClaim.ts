import type NodesCrossSignClaimHandler from '../handlers/NodesCrossSignClaim';
import type { HandlerTypes } from '@matrixai/rpc';
import { DuplexCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesCrossSignClaimHandler>;

const nodesCrossSignClaim = new DuplexCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesCrossSignClaim;
