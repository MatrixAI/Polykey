import type VaultsScanHandler from '../handlers/VaultsScan';
import type { HandlerTypes } from '../../../rpc/types';
import { ServerCaller } from '@matrixai/rpc/dist/callers';

type CallerTypes = HandlerTypes<VaultsScanHandler>;

const vaultsScan = new ServerCaller<
  CallerTypes['input'],
  CallerTypes['output']
>();

export default vaultsScan;
