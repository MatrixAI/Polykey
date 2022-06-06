import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type PolykeyAgent from '../../PolykeyAgent';
import type Logger from '@matrixai/logger';
import { status, running } from '@matrixai/async-init';
import * as grpcUtils from '../../grpc/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as clientUtils from '../utils';

function agentStop({
  authenticate,
  pkAgent,
  logger,
}: {
  authenticate: Authenticate;
  pkAgent: PolykeyAgent;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    const response = new utilsPB.EmptyMessage();
    // If not running or in stopping status, then respond successfully
    if (!pkAgent[running] || pkAgent[status] === 'stopping') {
      callback(null, response);
      return;
    }
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      // Respond first to close the GRPC connection
      callback(null, response);
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e) && logger.error(e);
      return;
    }
    // Stop is called after GRPC resources are cleared
    await pkAgent.stop();
    return;
  };
}

export default agentStop;
