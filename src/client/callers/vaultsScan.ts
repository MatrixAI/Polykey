import type { HandlerTypes } from '@matrixai/rpc';
import type VaultsScan from '../handlers/VaultsScan';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsScan>;

const vaultsScan = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsScan;
