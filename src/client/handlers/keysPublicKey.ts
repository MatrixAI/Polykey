import type { RPCRequestParams, RPCResponseResult } from '../types';
import type KeyRing from '../../keys/KeyRing';
import type { PasswordMessage, PublicKeyMessage } from './types';
import * as keysUtils from '../../keys/utils/index';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const keysPublicKey = new UnaryCaller<
  RPCRequestParams,
  RPCResponseResult<PublicKeyMessage>
>();

class KeysPublicKeyHandler extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  RPCRequestParams<PasswordMessage>,
  RPCResponseResult<PublicKeyMessage>
> {
  public async handle(): Promise<RPCResponseResult<PublicKeyMessage>> {
    const { keyRing } = this.container;
    const publicKeyJwk = keysUtils.publicKeyToJWK(keyRing.keyPair.publicKey);
    return {
      publicKeyJwk,
    };
  }
}

export { keysPublicKey, KeysPublicKeyHandler };
