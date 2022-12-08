import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type Sigchain from '../../sigchain/Sigchain';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import * as agentUtils from '../utils';
import * as claimsUtils from '../../claims/utils';
import { encodeClaimId } from '../../ids';

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
    call: grpc.ServerWritableStream<nodesPB.ClaimId, nodesPB.AgentClaim>,
  ): Promise<void> => {
    const genClaims = grpcUtils.generatorWritable(call, false);
    try {
      // Const seekClaimId = decodeClaimId(call.request.getClaimId());
      await db.withTransactionF(async (tran) => {
        for await (const [claimId, signedClaim] of sigchain.getSignedClaims(
          { /* seek: seekClaimId,*/ order: 'asc' },
          tran,
        )) {
          const encodedClaim = claimsUtils.generateSignedClaim(signedClaim);
          const response = new nodesPB.AgentClaim();
          response.setClaimId(encodeClaimId(claimId));
          response.setPayload(encodedClaim.payload);
          const signatureMessages = encodedClaim.signatures.map((item) => {
            return new nodesPB.Signature()
              .setSignature(item.signature)
              .setProtected(item.protected);
          });
          response.setSignaturesList(signatureMessages);
          await genClaims.next(response);
        }
      });
      await genClaims.next(null);
    } catch (e) {
      await genClaims.throw(e);
      !agentUtils.isAgentClientError(e) &&
        logger.error(`${nodesChainDataGet.name}:${e}`);
      return;
    }
  };
}

export default nodesChainDataGet;
