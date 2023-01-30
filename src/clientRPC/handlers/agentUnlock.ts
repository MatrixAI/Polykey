import type { UnaryHandler } from '../../RPC/types';
import type Logger from '@matrixai/logger';
import type RPCClient from '../../RPC/RPCClient';
import type { JSONValue } from '../../types';
import type { ClientDataAndMetadata } from '../types';

const agentUnlockName = 'agentStatus';
const agentUnlockHandler: UnaryHandler<
  ClientDataAndMetadata<null>,
  ClientDataAndMetadata<null>
> = async (
  _input,
  _container: {
    logger: Logger;
  },
  _connectionInfo,
  _ctx,
) => {
  // This is a NOP handler,
  // authentication and unlocking is handled via middleware.
  // Failure to authenticate will be an error from the middleware layer.
  return {
    metadata: {},
    data: null,
  };
};

const agentUnlockCaller = async (
  metadata: Record<string, JSONValue>,
  rpcClient: RPCClient,
) => {
  return rpcClient.unaryCaller<
    ClientDataAndMetadata<null>,
    ClientDataAndMetadata<null>
  >(agentUnlockName, {
    metadata: metadata,
    data: null,
  });
};

export { agentUnlockName, agentUnlockHandler, agentUnlockCaller };
