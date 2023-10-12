import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsSecretsMkdir from '../handlers/VaultsSecretsMkdir';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsSecretsMkdir>;

const vaultsSecretsMkdir = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsSecretsMkdir;
