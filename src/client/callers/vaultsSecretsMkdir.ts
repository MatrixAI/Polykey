import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsSecretsMkdir from '../handlers/VaultsSecretsMkdir';
import { DuplexCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsSecretsMkdir>;

const vaultsSecretsMkdir = new DuplexCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsSecretsMkdir;
