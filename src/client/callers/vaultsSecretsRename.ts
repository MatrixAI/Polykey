import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsSecretsRename from '../handlers/vaultsSecretsRename';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsSecretsRename>;

const vaultsSecretsRename = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsSecretsRename;
