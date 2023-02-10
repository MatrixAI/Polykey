import type { UnaryHandlerImplementation } from '../../RPC/types';
import type Logger from '@matrixai/logger';
import type { WithMetadata } from '../types';
import { UnaryHandler } from '../../RPC/handlers';
import { UnaryCaller } from '../../RPC/callers';

const agentUnlockCaller = new UnaryCaller<WithMetadata, WithMetadata>();

class AgentUnlockHandler extends UnaryHandler<
  { logger: Logger },
  WithMetadata,
  WithMetadata
> {
  public handle: UnaryHandlerImplementation<WithMetadata, WithMetadata> =
    async () => {
      // This is a NOP handler,
      // authentication and unlocking is handled via middleware.
      // Failure to authenticate will be an error from the middleware layer.
      return {
        metadata: {
          Authorization: '',
        },
      };
    };
}

export { agentUnlockCaller, AgentUnlockHandler };
