import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  IdentityRequestData,
  IdentityResponseData,
  TokenIdentityRequest,
  TokenIdentityResponse,
} from '../types.js';
import type KeyRing from '../../keys/KeyRing.js';
import type { PublicKey } from '../../keys/types.js';
import { UnaryHandler } from '@matrixai/rpc';
import Token from '../../tokens/Token.js';
import * as clientErrors from '../errors.js';
import * as nodesUtils from '../../nodes/utils.js';

class AuthSignToken extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  ClientRPCRequestParams<TokenIdentityRequest>,
  ClientRPCResponseResult<TokenIdentityResponse>
> {
  public handle = async (
    input: ClientRPCRequestParams<TokenIdentityRequest>,
  ): Promise<TokenIdentityResponse> => {
    const { keyRing }: { keyRing: KeyRing } = this.container;

    // Get and verify incoming node
    const inputToken = { payload: input.payload, signatures: input.signatures };
    const incomingToken = Token.fromEncoded<IdentityRequestData>(inputToken);
    if (!('publicKey' in incomingToken.payload)) {
      throw new clientErrors.ErrorAuthenticationInvalidToken(
        'Input token does not contain public key',
      );
    }
    const incomingPublicKey = Buffer.from(
      incomingToken.payload.publicKey,
      'base64url',
    ) as PublicKey;
    if (!incomingToken.verifyWithPublicKey(incomingPublicKey)) {
      throw new clientErrors.ErrorAuthenticationInvalidToken(
        'Incoming token does not match its signature',
      );
    }

    // Create the outgoing token with the incoming token integrated into the
    // payload.
    const outgoingTokenPayload: IdentityResponseData = {
      requestToken: inputToken,
      nodeId: nodesUtils.encodeNodeId(keyRing.getNodeId()),
    };
    const outgoingToken =
      Token.fromPayload<IdentityResponseData>(outgoingTokenPayload);
    outgoingToken.signWithPrivateKey(keyRing.keyPair);
    return outgoingToken.toEncoded();
  };
}

export default AuthSignToken;
