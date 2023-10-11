import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsList from '../handlers/VaultsList';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsList>;

const vaultsList = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsList;
