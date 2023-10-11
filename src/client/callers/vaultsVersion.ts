import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsVersion from '../handlers/vaultsVersion';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsVersion>;

const vaultsVersion = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsVersion;
