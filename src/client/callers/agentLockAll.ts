import type { HandlerTypes } from '@matrixai/rpc';
import type AgentLockAll from '../handlers/AgentLockAll.js';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<AgentLockAll>;

const agentLockAll = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default agentLockAll;
