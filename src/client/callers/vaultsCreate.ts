import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsCreate from '../handlers/vaultsCreate';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsCreate>;

const vaultsCreate = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsCreate;
