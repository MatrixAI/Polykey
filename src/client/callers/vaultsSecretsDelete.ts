import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsSecretsDelete from '../handlers/VaultsSecretsDelete';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsSecretsDelete>;

const vaultsSecretsDelete = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsSecretsDelete;
