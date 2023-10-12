import type { HandlerTypes } from '@matrixai/rpc';
import type AgentUnlock from '../handlers/AgentUnlock';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<AgentUnlock>;

const agentUnlock = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default agentUnlock;
