import type { HandlerTypes } from '@matrixai/rpc';
import type NodesClaimNetworkSign from '../handlers/NodesClaimNetworkSign.js';
import { DuplexCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesClaimNetworkSign>;

const nodesClaimNetworkSign = new DuplexCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesClaimNetworkSign;
