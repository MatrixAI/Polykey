import type { KeyPairMessage, PasswordMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type KeyRing from '../../keys/KeyRing';
import * as keysUtils from '../../keys/utils/index';
import { UnaryHandler } from '@matrixai/rpc/dist/handlers';

class KeysKeyPairHandler extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  ClientRPCRequestParams<PasswordMessage>,
  ClientRPCResponseResult<KeyPairMessage>
> {
  public handle = async(
    input: ClientRPCRequestParams<PasswordMessage>,
  ): Promise<ClientRPCResponseResult<KeyPairMessage>> => {
    const { keyRing } = this.container;
    const privateJWK = keysUtils.privateKeyToJWK(keyRing.keyPair.privateKey);
    const privateKeyJwe = keysUtils.wrapWithPassword(
      input.password,
      privateJWK,
    );
    const publicKeyJwk = keysUtils.publicKeyToJWK(keyRing.keyPair.publicKey);
    return {
      privateKeyJwe,
      publicKeyJwk,
    };
  }
}

export { KeysKeyPairHandler };
