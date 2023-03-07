import type { RPCRequestParams, RPCResponseResult } from '../types';
import type KeyRing from '../../keys/KeyRing';
import type { DataMessage, DecryptMessage } from './types';
import type { PublicKey } from '../../keys/types';
import { never } from '../../utils/index';
import * as keysUtils from '../../keys/utils/index';
import * as keysErrors from '../../keys/errors';
import { UnaryHandler } from '../../RPC/handlers';
import { UnaryCaller } from '../../RPC/callers';

const keysEncrypt = new UnaryCaller<
  RPCRequestParams<DecryptMessage>,
  RPCResponseResult<DataMessage>
>();

class KeysEncryptHandler extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  RPCRequestParams<DecryptMessage>,
  RPCResponseResult<DataMessage>
> {
  public async handle(
    input: RPCRequestParams<DecryptMessage>,
  ): Promise<RPCResponseResult<DataMessage>> {
    const { keyRing } = this.container;

    let publicKey: PublicKey | undefined;
    try {
      const jwk = input.publicKeyJwk;
      publicKey = keysUtils.publicKeyFromJWK(jwk);
      if (publicKey == null) never();
    } catch (e) {
      throw new keysErrors.ErrorPublicKeyParse(undefined, { cause: e });
    }
    const data = keyRing.encrypt(publicKey, Buffer.from(input.data, 'binary'));
    return {
      data: data.toString('binary'),
    };
  }
}

export { keysEncrypt, KeysEncryptHandler };
