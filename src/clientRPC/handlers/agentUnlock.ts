import type { UnaryHandlerImplementation } from '../../RPC/types';
import type Logger from '@matrixai/logger';
import type { ClientDataAndMetadata } from '../types';
import { UnaryHandler } from '../../RPC/handlers';
import { UnaryCaller } from '../../RPC/callers';

const agentUnlockCaller = new UnaryCaller<
  ClientDataAndMetadata<null>,
  ClientDataAndMetadata<null>
>();

class AgentUnlockHandler extends UnaryHandler<
  { logger: Logger },
  ClientDataAndMetadata<null>,
  ClientDataAndMetadata<null>
> {
  public handle: UnaryHandlerImplementation<
    ClientDataAndMetadata<null>,
    ClientDataAndMetadata<null>
  > = async () => {
    // This is a NOP handler,
    // authentication and unlocking is handled via middleware.
    // Failure to authenticate will be an error from the middleware layer.
    return {
      metadata: {},
      data: null,
    };
  };
}

export { agentUnlockCaller, AgentUnlockHandler };
