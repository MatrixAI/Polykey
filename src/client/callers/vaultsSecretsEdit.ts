import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsSecretsEdit from '../handlers/vaultsSecretsEdit';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsSecretsEdit>;

const vaultsSecretsEdit = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsSecretsEdit;
