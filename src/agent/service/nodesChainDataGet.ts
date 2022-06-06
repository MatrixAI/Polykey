import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type Sigchain from '../../sigchain/Sigchain';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import type { ClaimIdEncoded } from '../../claims/types';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import * as agentUtils from '../utils';

/**
 * Retrieves the ChainDataEncoded of this node.
 */
function nodesChainDataGet({
  sigchain,
  db,
  logger,
}: {
  sigchain: Sigchain;
  db: DB;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, nodesPB.ChainData>,
    callback: grpc.sendUnaryData<nodesPB.ChainData>,
  ): Promise<void> => {
    try {
      const response = new nodesPB.ChainData();
      const chainData = await db.withTransactionF(async (tran) =>
        sigchain.getChainData(tran),
      );
      // Iterate through each claim in the chain, and serialize for transport
      let claimIdEncoded: ClaimIdEncoded;
      for (claimIdEncoded in chainData) {
        const claim = chainData[claimIdEncoded];
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
        response.getChainDataMap().set(claimIdEncoded, claimMessage);
      }
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e, true));
      !agentUtils.isAgentClientError(e) && logger.error(e);
      return;
    }
  };
}

export default nodesChainDataGet;
