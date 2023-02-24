import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { KeyPairMessage, PasswordMessage } from './types';
import type KeyRing from 'keys/KeyRing';
import * as keysUtils from 'keys/utils/index';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const keysKeyPair = new UnaryCaller<
  RPCRequestParams<PasswordMessage>,
  RPCResponseResult<KeyPairMessage>
>();

class KeysKeyPairHandler extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  RPCRequestParams<PasswordMessage>,
  RPCResponseResult<KeyPairMessage>
> {
  public async handle(
    input: RPCRequestParams<PasswordMessage>,
  ): Promise<RPCResponseResult<KeyPairMessage>> {
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

export { keysKeyPair, KeysKeyPairHandler };
