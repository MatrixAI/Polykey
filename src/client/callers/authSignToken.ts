import type { HandlerTypes } from '@matrixai/rpc';
import type AuthSignToken from '../handlers/AgentLockAll.js';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<AuthSignToken>;

const authSignToken = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default authSignToken;
