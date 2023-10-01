import type NodesCrossSignClaimHandler from '../handlers/NodesCrossSignClaim';
import type { HandlerTypes } from '../../../rpc/types';
import { DuplexCaller } from '../../../rpc/callers';

type CallerTypes = HandlerTypes<NodesCrossSignClaimHandler>;

const nodesCrossSignClaim = new DuplexCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesCrossSignClaim;
