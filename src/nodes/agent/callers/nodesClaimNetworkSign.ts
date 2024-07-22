import type { HandlerTypes } from '@matrixai/rpc';
import type NodesClaimNetworkSign from '../handlers/NodesClaimNetworkSign';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesClaimNetworkSign>;

const nodesClaimNetworkSign = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesClaimNetworkSign;
