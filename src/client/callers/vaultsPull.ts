import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsPull from '../handlers/vaultsPull';
import { UnaryCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsPull>;

const vaultsPull = new UnaryCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsPull;
