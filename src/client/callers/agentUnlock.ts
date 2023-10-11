import type { HandlerTypes } from '@matrixai/rpc';
import type AgentUnlock from '../handlers/agentUnlock';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<AgentUnlock>;

const agentUnlock = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default agentUnlock;
