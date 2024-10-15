import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  DataMessage,
  DecryptMessage,
} from '../types';
import type KeyRing from '../../keys/KeyRing';
import type { PublicKey } from '../../keys/types';
import { UnaryHandler } from '@matrixai/rpc';
import { never } from '../../utils';
import * as keysUtils from '../../keys/utils';
import * as keysErrors from '../../keys/errors';

class KeysEncrypt extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  ClientRPCRequestParams<DecryptMessage>,
  ClientRPCResponseResult<DataMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<DecryptMessage>,
  ): Promise<ClientRPCResponseResult<DataMessage>> => {
    const { keyRing }: { keyRing: KeyRing } = this.container;

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
  };
}

export default KeysEncrypt;
