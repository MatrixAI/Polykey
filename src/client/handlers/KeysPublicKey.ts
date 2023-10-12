import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  PublicKeyMessage,
} from '../types';
import type KeyRing from '../../keys/KeyRing';
import { UnaryHandler } from '@matrixai/rpc';
import * as keysUtils from '../../keys/utils/index';

class KeysPublicKey extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<PublicKeyMessage>
> {
  public handle = async (): Promise<
    ClientRPCResponseResult<PublicKeyMessage>
  > => {
    const { keyRing } = this.container;
    const publicKeyJwk = keysUtils.publicKeyToJWK(keyRing.keyPair.publicKey);
    return {
      publicKeyJwk,
    };
  };
}

export default KeysPublicKey;
