import type { HandlerTypes } from '@matrixai/rpc';
import type NodesClaimNetworkAuthorityGet from '../handlers/NodesClaimNetworkAuthorityGet.js';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesClaimNetworkAuthorityGet>;

const nodesClaimNetworkAuthorityGet = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesClaimNetworkAuthorityGet;
