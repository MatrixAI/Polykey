import * as grpc from '@grpc/grpc-js';
import * as clientPB from '../proto/js/Client_pb';

import * as grpcUtils from '../grpc/utils';
import * as errors from '../errors';

const createEchoRPC = () => {
  return {
    echo: async (
      call: grpc.ServerUnaryCall<clientPB.EchoMessage, clientPB.EchoMessage>,
      callback: grpc.sendUnaryData<clientPB.EchoMessage>,
    ): Promise<void> => {
      const response = new clientPB.EchoMessage();
      const message = call.request.getChallenge();
      if (message === 'ThrowAnError') {
        callback(
          grpcUtils.fromError(
            new errors.ErrorPolykey('Error Thrown As Requested'),
          ),
          null,
        );
      }
      response.setChallenge(message);
      callback(null, response);
    },
  };
};

export default createEchoRPC;
