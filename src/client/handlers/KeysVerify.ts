import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  SuccessMessage,
  VerifySignatureMessage,
} from '../types.js';
import type KeyRing from '../../keys/KeyRing.js';
import type { PublicKey, Signature } from '../../keys/types.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as keysUtils from '../../keys/utils/index.js';
import { never } from '../../utils/index.js';
import * as keysErrors from '../../keys/errors.js';

class KeysVerify extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  ClientRPCRequestParams<VerifySignatureMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<VerifySignatureMessage>,
  ): Promise<ClientRPCResponseResult<SuccessMessage>> => {
    const { keyRing }: { keyRing: KeyRing } = this.container;
    let publicKey: PublicKey | undefined;
    try {
      const jwk = input.publicKeyJwk;
      publicKey = keysUtils.publicKeyFromJWK(jwk);
      if (publicKey == null) never('failed to get public key from JWK');
    } catch (e) {
      throw new keysErrors.ErrorPublicKeyParse(undefined, { cause: e });
    }
    const success = keyRing.verify(
      publicKey,
      Buffer.from(input.data, 'binary'),
      Buffer.from(input.signature, 'binary') as Signature,
    );
    return { success: success };
  };
}

export default KeysVerify;
