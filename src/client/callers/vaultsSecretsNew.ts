import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsSecretsNew from '../handlers/vaultsSecretsNew';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsSecretsNew>;

const vaultsSecretsNew = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsSecretsNew;
