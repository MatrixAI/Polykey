import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsRename from '../handlers/vaultsRename';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsRename>;

const vaultsRename = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsRename;
