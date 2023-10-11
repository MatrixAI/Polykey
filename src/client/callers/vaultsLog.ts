import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsLog from '../handlers/vaultsLog';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsLog>;

const vaultsLog = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsLog;
