import type { KeyManager } from '../keys';

import type * as grpc from '@grpc/grpc-js';
import type * as utils from './utils';
import type * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import * as grpcUtils from '../grpc/utils';
import * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';
import * as keysPB from '../proto/js/polykey/v1/keys/keys_pb';
import * as agentPB from '../proto/js/polykey/v1/agent/agent_pb';

const createStatusRPC = ({
  authenticate,
  keyManager,
}: {
  authenticate: utils.Authenticate;
  keyManager: KeyManager;
}) => {
  return {
    agentStatus: async (
      call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, agentPB.InfoMessage>,
      callback: grpc.sendUnaryData<agentPB.InfoMessage>,
    ): Promise<void> => {
      const response = new agentPB.InfoMessage();
      const action = async (response: agentPB.InfoMessage) => {
        const nodeMessage = new nodesPB.Node();
        const addressMessage = new nodesPB.Address();
        const certificateMessage = new keysPB.Certificate();
        // TODO set nodeId, host, port from status object
        // Also can add any other info we want to return
        nodeMessage.setNodeId('nodeId');
        addressMessage.setHost('host');
        addressMessage.setPort(0);
        certificateMessage.setCert(
          (await keyManager.getRootCertChain()).toString(),
        );
        response.setNodeId(nodeMessage);
        response.setAddress(addressMessage);
        response.setCert(certificateMessage);
      };

      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);
        await action(response);
        callback(null, response);
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
      }
    },
  };
};

export default createStatusRPC;
