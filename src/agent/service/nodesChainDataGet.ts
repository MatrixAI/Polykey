import type * as grpc from '@grpc/grpc-js';
import type { ClaimIdString } from '../../claims/types';
import type { NodeManager } from '../../nodes';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import { utils as grpcUtils } from '../../grpc';
import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';

/**
 * Retrieves the ChainDataEncoded of this node.
 */
function nodesChainDataGet({ nodeManager }: { nodeManager: NodeManager }) {
  return async (
    call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, nodesPB.ChainData>,
    callback: grpc.sendUnaryData<nodesPB.ChainData>,
  ): Promise<void> => {
    const response = new nodesPB.ChainData();
    try {
      const chainData = await nodeManager.getChainData();
      // Iterate through each claim in the chain, and serialize for transport
      for (const c in chainData) {
        const claimId = c as ClaimIdString;
        const claim = chainData[claimId];
        const claimMessage = new nodesPB.AgentClaim();
        // Will always have a payload (never undefined) so cast as string
        claimMessage.setPayload(claim.payload as string);
        // Add the signatures
        for (const signatureData of claim.signatures) {
          const signature = new nodesPB.Signature();
          // Will always have a protected header (never undefined) so cast as string
          signature.setProtected(signatureData.protected as string);
          signature.setSignature(signatureData.signature);
          claimMessage.getSignaturesList().push(signature);
        }
        // Add the serialized claim
        response.getChainDataMap().set(claimId, claimMessage);
      }
    } catch (err) {
      callback(grpcUtils.fromError(err), response);
    }
    callback(null, response);
  };
}

export default nodesChainDataGet;
