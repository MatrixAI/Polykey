import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  KeyPairMessage,
  PasswordMessage,
} from '../types.js';
import type KeyRing from '../../keys/KeyRing.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as keysUtils from '../../keys/utils/index.js';

class KeysKeyPair extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  ClientRPCRequestParams<PasswordMessage>,
  ClientRPCResponseResult<KeyPairMessage>
> {
  public handle = async (
    input: ClientRPCRequestParams<PasswordMessage>,
  ): Promise<ClientRPCResponseResult<KeyPairMessage>> => {
    const { keyRing }: { keyRing: KeyRing } = this.container;
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
  };
}

export default KeysKeyPair;
