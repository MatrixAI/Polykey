import type { HandlerTypes } from '@matrixai/rpc';
import type AgentStatus from '../handlers/AgentStatus';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<AgentStatus>;

const agentStatus = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default agentStatus;
