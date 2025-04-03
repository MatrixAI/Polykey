import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsPermissionUnset from '../handlers/VaultsPermissionUnset.js';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsPermissionUnset>;

const vaultsPermissionUnset = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsPermissionUnset;
