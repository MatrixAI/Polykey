import type { UnaryHandler } from '../../RPC/types';
import type Logger from '@matrixai/logger';
import type RPCClient from '../../RPC/RPCClient';
import type { POJO } from '../../types';

const agentUnlockName = 'agentStatus';
const agentUnlockHandler: UnaryHandler<null, null> = async (
  _input,
  _container: {
    logger: Logger;
  },
  _connectionInfo,
  _ctx,
) => {
  // This is a NOP handler,
  // authentication and unlocking is handled via middleware
  return null;
};

const agentUnlockCaller = async (metadata: POJO, rpcClient: RPCClient) => {
  await rpcClient.unaryCaller<null, null>(agentUnlockName, null, metadata);
};

export { agentUnlockName, agentUnlockHandler, agentUnlockCaller };
