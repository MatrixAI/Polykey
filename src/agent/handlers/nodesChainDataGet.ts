import type Sigchain from '../../sigchain/Sigchain';
import type { DB } from '@matrixai/db';
import type { ClaimIdMessage, AgentClaimMessage } from './types';
import type { AgentRPCRequestParams, AgentRPCResponseResult } from '../types';
import * as claimsUtils from '../../claims/utils';
import { ServerHandler } from '../../rpc/handlers';
import {encodeClaimId} from "../../claims/utils";

class NodesChainDataGetHandler extends ServerHandler<
  {
    sigchain: Sigchain;
    db: DB;
  },
  AgentRPCRequestParams<ClaimIdMessage>,
  AgentRPCResponseResult<AgentClaimMessage>
> {
  public async *handle(
    _input: ClaimIdMessage,
  ): AsyncGenerator<AgentRPCResponseResult<AgentClaimMessage>> {
    const { sigchain, db } = this.container;
    yield* db.withTransactionG(async function* (
      tran,
    ): AsyncGenerator<AgentRPCResponseResult<AgentClaimMessage>> {
      for await (const [claimId, signedClaim] of sigchain.getSignedClaims(
        { /* seek: seekClaimId,*/ order: 'asc' },
        tran,
      )) {
        const encodedClaim = claimsUtils.generateSignedClaim(signedClaim);
        const response: AgentClaimMessage = {
          claimIdEncoded: claimsUtils.encodeClaimId(claimId),
          signedTokenEncoded: encodedClaim,
        };
        yield response;
      }
    });
  }
}

export { NodesChainDataGetHandler };
