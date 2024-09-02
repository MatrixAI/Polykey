import type { HandlerTypes } from '@matrixai/rpc';
import type NodesClaimNetworkVerify from '../handlers/NodesClaimNetworkVerify';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesClaimNetworkVerify>;

const nodesClaimNetworkVerify = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesClaimNetworkVerify;
