import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsSecretsStat from '../handlers/VaultsSecretsStat';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsSecretsStat>;

const vaultsSecretsStat = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsSecretsStat;
