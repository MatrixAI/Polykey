import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsSecretsList from '../handlers/vaultsSecretsList';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsSecretsList>;

const vaultsSecretsList = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsSecretsList;
