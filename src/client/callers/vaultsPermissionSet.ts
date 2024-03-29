import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsPermissionSet from '../handlers/VaultsPermissionSet';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsPermissionSet>;

const vaultsPermissionSet = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsPermissionSet;
