import type * as grpc from '@grpc/grpc-js';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function echo(_) {
  return async (
    call: grpc.ServerUnaryCall<utilsPB.EchoMessage, utilsPB.EchoMessage>,
    callback: grpc.sendUnaryData<utilsPB.EchoMessage>,
  ): Promise<void> => {
    const response = new utilsPB.EchoMessage();
    response.setChallenge(call.request.getChallenge());
    callback(null, response);
  };
}

export default echo;
