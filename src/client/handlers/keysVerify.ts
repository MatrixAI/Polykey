import type { SuccessMessage, VerifySignatureMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type KeyRing from '../../keys/KeyRing';
import type { PublicKey, Signature } from '../../keys/types';
import { UnaryHandler } from '@matrixai/rpc';
import * as keysUtils from '../../keys/utils/index';
import { never } from '../../utils/index';
import * as keysErrors from '../../keys/errors';

class KeysVerifyHandler extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  ClientRPCRequestParams<VerifySignatureMessage>,
  ClientRPCResponseResult<SuccessMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<VerifySignatureMessage>,
  ): Promise<ClientRPCResponseResult<SuccessMessage>> => {
    const { keyRing } = this.container;
    let publicKey: PublicKey | undefined;
    try {
      const jwk = input.publicKeyJwk;
      publicKey = keysUtils.publicKeyFromJWK(jwk);
      if (publicKey == null) never();
    } catch (e) {
      throw new keysErrors.ErrorPublicKeyParse(undefined, { cause: e });
    }
    const success = keyRing.verify(
      publicKey,
      Buffer.from(input.data, 'binary'),
      Buffer.from(input.signature, 'binary') as Signature,
    );
    return {
      success,
    };
  };
}

export { KeysVerifyHandler };
