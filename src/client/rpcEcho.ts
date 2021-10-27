import type { SessionManager } from '../sessions';

import * as utils from './utils';
import * as errors from '../errors';
import * as grpc from '@grpc/grpc-js';
import * as grpcUtils from '../grpc/utils';
import { messages } from '../agent';

const createEchoRPC = ({
  sessionManager,
}: {
  sessionManager: SessionManager;
}) => {
  return {
    echo: async (
      call: grpc.ServerUnaryCall<
        messages.common.EchoMessage,
        messages.common.EchoMessage
      >,
      callback: grpc.sendUnaryData<messages.common.EchoMessage>,
    ): Promise<void> => {
      const response = new messages.common.EchoMessage();
      const action = async (response: messages.common.EchoMessage) => {
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
