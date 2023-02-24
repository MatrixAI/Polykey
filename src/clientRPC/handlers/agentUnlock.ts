import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { ContainerType } from 'RPC/types';
import { UnaryHandler } from '../../RPC/handlers';
import { UnaryCaller } from '../../RPC/callers';

const agentUnlock = new UnaryCaller<RPCRequestParams, RPCResponseResult>();

class AgentUnlockHandler extends UnaryHandler<
  ContainerType,
  RPCRequestParams,
  RPCResponseResult
> {
  public async handle(): Promise<RPCResponseResult> {
    // This is a NOP handler,
    // authentication and unlocking is handled via middleware.
    // Failure to authenticate will be an error from the middleware layer.
    return {};
  }
}

export { agentUnlock, AgentUnlockHandler };
