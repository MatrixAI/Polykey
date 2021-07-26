import type { SessionManager } from '../sessions';

import * as utils from './utils';
import * as errors from '../errors';
import * as grpc from '@grpc/grpc-js';
import * as grpcUtils from '../grpc/utils';
import * as clientPB from '../proto/js/Client_pb';

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
        await sessionManager.verifyToken(utils.getToken(call.metadata));
        await action(response);
        const responseMeta = utils.createMetaTokenResponse(
          await sessionManager.generateToken(),
        );
        call.sendMetadata(responseMeta);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
  };
};

export default createEchoRPC;
