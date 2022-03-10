import type { Host, Port } from '../../network/types';
import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type PolykeyAgent from '../../PolykeyAgent';
import type * as agentPB from '../../proto/js/polykey/v1/agent/agent_pb';
import * as grpcUtils from '../../grpc/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function agentRestart({
  authenticate,
  pkAgent,
}: {
  authenticate: Authenticate;
  pkAgent: PolykeyAgent;
}) {
  return async (
    call: grpc.ServerUnaryCall<agentPB.RestartMessage, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    const response = new utilsPB.EmptyMessage();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      // Respond first to close the GRPC connection
      callback(null, response);
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
    const password = call.request.getPassword();
    const networkConfig = {
      clientHost: call.request.getClientHost() as Host,
      clientPort: call.request.getClientPort() as Port,
      ingressHost: call.request.getIngressHost() as Host,
      ingressPort: call.request.getIngressPort() as Port,
    };
    const fresh = call.request.getFresh();
    await pkAgent.restart({
      password,
      networkConfig,
      fresh,
    });
    return;
  };
}

export default agentRestart;
