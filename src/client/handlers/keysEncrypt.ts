import type { DataMessage, DecryptMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type KeyRing from '../../keys/KeyRing';
import type { PublicKey } from '../../keys/types';
import { never } from '../../utils/index';
import * as keysUtils from '../../keys/utils/index';
import * as keysErrors from '../../keys/errors';
import { UnaryHandler } from '@matrixai/rpc/dist/handlers';

class KeysEncryptHandler extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  ClientRPCRequestParams<DecryptMessage>,
  ClientRPCResponseResult<DataMessage>
> {
  public handle = async(
    input: ClientRPCRequestParams<DecryptMessage>,
  ): Promise<ClientRPCResponseResult<DataMessage>> => {
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

export { KeysEncryptHandler };
