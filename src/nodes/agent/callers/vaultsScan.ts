import type VaultsScanHandler from '../handlers/VaultsScan';
import type { HandlerTypes } from '@matrixai/rpc';
import { ServerCaller } from '@matrixai/rpc';

type CallerTypes = HandlerTypes<VaultsScanHandler>;

const vaultsScan = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsScan;
