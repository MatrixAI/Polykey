import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsSecretsNewDir from '../handlers/vaultsSecretsNewDir';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsSecretsNewDir>;

const vaultsSecretsNewDir = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsSecretsNewDir;
