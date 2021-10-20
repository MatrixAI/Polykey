import type { SessionManager } from '../sessions';

import * as grpc from '@grpc/grpc-js';
import * as utils from './utils';
import * as grpcUtils from '../grpc/utils';
import * as errors from '../errors';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';

const createEchoRPC = ({
  sessionManager,
}: {
  sessionManager: SessionManager;
}) => {
  return {
    echo: async (
      call: grpc.ServerUnaryCall<utilsPB.EchoMessage, utilsPB.EchoMessage>,
      callback: grpc.sendUnaryData<utilsPB.EchoMessage>,
    ): Promise<void> => {
      const response = new utilsPB.EchoMessage();
      const action = async (response: utilsPB.EchoMessage) => {
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
