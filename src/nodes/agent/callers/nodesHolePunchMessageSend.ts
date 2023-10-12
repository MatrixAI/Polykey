import type { HandlerTypes } from '@matrixai/rpc';
import type NodesHolePunchMessageSend from '../handlers/NodesHolePunchMessageSend';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesHolePunchMessageSend>;

const nodesHolePunchMessageSend = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesHolePunchMessageSend;
