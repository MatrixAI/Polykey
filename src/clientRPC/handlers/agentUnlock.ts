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
  public async handle(): Promise<WithMetadata> {
    // This is a NOP handler,
    // authentication and unlocking is handled via middleware.
    // Failure to authenticate will be an error from the middleware layer.
    return {};
  }
}

export { agentUnlockCaller, AgentUnlockHandler };
