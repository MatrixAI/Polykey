import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  IdentityResponseData,
  TokenIdentityResponse,
} from '../types.js';
import type KeyRing from '../../keys/KeyRing.js';
import { UnaryHandler } from '@matrixai/rpc';
import Token from '../../tokens/Token.js';
import * as nodesUtils from '../../nodes/utils.js';

class AuthSignToken extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<TokenIdentityResponse>
> {
  public handle = async (): Promise<TokenIdentityResponse> => {
    const { keyRing }: { keyRing: KeyRing } = this.container;
    const tokenPayload: IdentityResponseData = {
      nodeId: nodesUtils.encodeNodeId(keyRing.getNodeId()),
    };
    const outgoingToken = Token.fromPayload<IdentityResponseData>(tokenPayload);
    outgoingToken.signWithPrivateKey(keyRing.keyPair);
    return outgoingToken.toEncoded();
  };
}

export default AuthSignToken;
