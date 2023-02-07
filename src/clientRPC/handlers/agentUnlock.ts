import type { ManifestItem } from '../../RPC/types';
import type Logger from '@matrixai/logger';
import type { ClientDataAndMetadata } from '../types';

const agentUnlock: ManifestItem<
  ClientDataAndMetadata<null>,
  ClientDataAndMetadata<null>
> = {
  type: 'UNARY',
  handler: async (
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
  },
};

export { agentUnlock };
