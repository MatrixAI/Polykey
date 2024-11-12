import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsSecretsCat from '../handlers/VaultsSecretsCat';
import { DuplexCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsSecretsCat>;

const vaultsSecretsCat = new DuplexCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsSecretsCat;
