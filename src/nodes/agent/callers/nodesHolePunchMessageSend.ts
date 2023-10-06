import type NodesHolePunchMessageSendHandler from '../handlers/NodesHolePunchMessageSend';
import type { HandlerTypes } from '../../../rpc/types';
import { UnaryCaller } from '@matrixai/rpc/dist/callers';

type CallerTypes = HandlerTypes<NodesHolePunchMessageSendHandler>;

const nodesHolePunchMessageSend = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default nodesHolePunchMessageSend;
