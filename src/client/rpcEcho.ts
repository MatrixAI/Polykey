import * as utils from './utils';
import * as errors from '../errors';
import * as grpc from '@grpc/grpc-js';
import * as grpcUtils from '../grpc/utils';
import * as clientPB from '../proto/js/Client_pb';

import { SessionManager } from '../session';

const createEchoRPC = ({
  sessionManager,
}: {
  sessionManager: SessionManager;
}) => {
  return {
    echo: async (
      call: grpc.ServerUnaryCall<clientPB.EchoMessage, clientPB.EchoMessage>,
      callback: grpc.sendUnaryData<clientPB.EchoMessage>,
    ): Promise<void> => {
      const response = new clientPB.EchoMessage();

      const action = async (response: clientPB.EchoMessage) => {
        const message = call.request.getChallenge();
        if (message === 'ThrowAnError') {
          throw new errors.ErrorPolykey('Error Thrown As Requested');
        }
        response.setChallenge(message);
        return response;
      };

      try {
        console.log('Echo meta: ', call.metadata);
        await utils.verifyToken(call.metadata, sessionManager);
        await action(response);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
  };
};

export default createEchoRPC;
