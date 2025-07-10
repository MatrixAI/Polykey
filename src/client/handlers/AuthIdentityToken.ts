import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  TokenIdentityResponse,
} from '../types.js';
import type { AuthIdentityToken as AuthIdentityJWT } from '../../tokens/payloads/authIdentityToken.js';
import type KeyRing from '../../keys/KeyRing.js';
import { IdSortable } from '@matrixai/id';
import { UnaryHandler } from '@matrixai/rpc';
import Token from '../../tokens/Token.js';
import * as nodesUtils from '../../nodes/utils.js';
import * as clientErrors from '../errors.js';

class AuthIdentityToken extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<TokenIdentityResponse>
> {
  public handle = async (): Promise<TokenIdentityResponse> => {
    const { keyRing }: { keyRing: KeyRing } = this.container;
    const idGen = new IdSortable();
    const jti = idGen.next().value;
    if (jti == null) {
      throw new clientErrors.ErrorClientAuthenticationInvalidJTI();
    }
    const outgoingToken = Token.fromPayload<AuthIdentityJWT>({
      jti: jti.toMultibase('base64'),
      exp: Math.floor(Date.now() / 1000) + 60, // 60 seconds after issuing
      iss: nodesUtils.encodeNodeId(keyRing.getNodeId()),
    });
    outgoingToken.signWithPrivateKey(keyRing.keyPair);
    return outgoingToken.toEncoded();
  };
}

export default AuthIdentityToken;
