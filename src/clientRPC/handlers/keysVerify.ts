import type { RPCRequestParams, RPCResponseResult } from '../types';
import type KeyRing from 'keys/KeyRing';
import type { PublicKey, Signature } from 'keys/types';
import type { SuccessMessage, VerifySignatureMessage } from './types';
import * as keysUtils from 'keys/utils/index';
import { never } from 'utils/index';
import * as keysErrors from 'keys/errors';
import { UnaryHandler } from '../../RPC/handlers';
import { UnaryCaller } from '../../RPC/callers';

const keysVerify = new UnaryCaller<
  RPCRequestParams<VerifySignatureMessage>,
  RPCResponseResult<SuccessMessage>
>();

class KeysVerifyHandler extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  RPCRequestParams<VerifySignatureMessage>,
  RPCResponseResult<SuccessMessage>
> {
  public async handle(
    input: RPCRequestParams<VerifySignatureMessage>,
  ): Promise<RPCResponseResult<SuccessMessage>> {
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
  }
}

export { keysVerify, KeysVerifyHandler };
