import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsSecretsRemove from '../handlers/VaultsSecretsRemove';
import { ClientCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsSecretsRemove>;

const vaultsSecretsRemove = new ClientCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsSecretsRemove;
