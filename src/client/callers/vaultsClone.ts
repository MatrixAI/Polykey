import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsClone from '../handlers/vaultsClone';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsClone>;

const vaultsClone = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsClone;
