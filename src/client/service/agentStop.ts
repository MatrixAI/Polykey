import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type PolykeyAgent from '../../PolykeyAgent';
import * as grpcUtils from '../../grpc/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function agentStop ({
  authenticate,
  pkAgent,
}: {
  authenticate: Authenticate;
  pkAgent: PolykeyAgent;
}) {
  return async (
    call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    const response = new utilsPB.EmptyMessage();
    if (!pkAgent.running) {
      callback(null, response);
      return;
    }
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      // Respond first to close the GRPC connection
      callback(null, response);
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
    // Stop is called after GRPC resources are cleared
    await pkAgent.stop();
    return;
  };
}

export default agentStop;
