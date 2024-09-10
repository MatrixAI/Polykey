import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsSecretsRemove from '../handlers/VaultsSecretsRemove';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsSecretsRemove>;

const vaultsSecretsRemove = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsSecretsRemove;
