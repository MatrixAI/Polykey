import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsSecretsRemove from '../handlers/VaultsSecretsRemove.js';
import { DuplexCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsSecretsRemove>;

const vaultsSecretsRemove = new DuplexCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsSecretsRemove;
