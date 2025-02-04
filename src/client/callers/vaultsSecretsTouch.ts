import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsSecretsTouch from '../handlers/VaultsSecretsTouch';
import { DuplexCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsSecretsTouch>;

const vaultsSecretsTouch = new DuplexCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsSecretsTouch;
