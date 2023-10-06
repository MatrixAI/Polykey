import type { PasswordMessage, PublicKeyMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type KeyRing from '../../keys/KeyRing';
import * as keysUtils from '../../keys/utils/index';
import { UnaryHandler } from '../../rpc/handlers';

class KeysPublicKeyHandler extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  ClientRPCRequestParams<PasswordMessage>,
  ClientRPCResponseResult<PublicKeyMessage>
> {
  public handle = async(): Promise<ClientRPCResponseResult<PublicKeyMessage>> => {
    const { keyRing } = this.container;
    const publicKeyJwk = keysUtils.publicKeyToJWK(keyRing.keyPair.publicKey);
    return {
      publicKeyJwk,
    };
  }
}

export { KeysPublicKeyHandler };
