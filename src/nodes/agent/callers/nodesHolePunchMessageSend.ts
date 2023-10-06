import type NodesHolePunchMessageSendHandler from '../handlers/NodesHolePunchMessageSend';
import type { HandlerTypes } from '@matrixai/rpc';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<NodesHolePunchMessageSendHandler>;

const nodesHolePunchMessageSend = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesHolePunchMessageSend;
