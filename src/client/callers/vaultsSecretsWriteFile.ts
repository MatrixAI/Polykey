import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsSecretsWriteFile from '../handlers/VaultsSecretsWriteFile';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsSecretsWriteFile>;

const vaultsSecretsWriteFile = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsSecretsWriteFile;
