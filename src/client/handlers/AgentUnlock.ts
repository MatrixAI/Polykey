import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { ContainerType } from '@matrixai/rpc';
import { UnaryHandler } from '@matrixai/rpc';

class AgentUnlock extends UnaryHandler<
  ContainerType,
  ClientRPCRequestParams,
  ClientRPCResponseResult
> {
  public handle = async (): Promise<ClientRPCResponseResult> => {
    // This is a NOP handler,
    // authentication and unlocking is handled via middleware.
    // Failure to authenticate will be an error from the middleware layer.
    return {};
  };
}

export default AgentUnlock;
