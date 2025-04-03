import type { HandlerTypes } from '@matrixai/rpc';
import type AgentStop from '../handlers/AgentStop.js';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<AgentStop>;

const agentStop = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default agentStop;
