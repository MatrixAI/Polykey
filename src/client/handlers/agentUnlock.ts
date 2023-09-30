import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { ContainerType } from '@matrixai/rpc/dist/types';
import { UnaryHandler } from '@matrixai/rpc/dist/handlers';

class AgentUnlockHandler extends UnaryHandler<
  ContainerType,
  ClientRPCRequestParams,
  ClientRPCResponseResult
> {
  public async handle(): Promise<ClientRPCResponseResult> {
    // This is a NOP handler,
    // authentication and unlocking is handled via middleware.
    // Failure to authenticate will be an error from the middleware layer.
    return {};
  }
}

export { AgentUnlockHandler };
