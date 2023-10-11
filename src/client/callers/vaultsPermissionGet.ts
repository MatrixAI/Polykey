import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsPermissionGet from '../handlers/vaultsPermissionGet';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsPermissionGet>;

const vaultsPermissionGet = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsPermissionGet;
