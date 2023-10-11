import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsSecretsGet from '../handlers/vaultsSecretsGet';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsSecretsGet>;

const vaultsSecretsGet = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsSecretsGet;
