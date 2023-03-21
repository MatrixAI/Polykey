import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { KeyPairMessage, PasswordMessage } from './types';
import type KeyRing from '../../keys/KeyRing';
import * as keysUtils from '../../keys/utils/index';
import { UnaryCaller } from '../../rpc/callers';
import { UnaryHandler } from '../../rpc/handlers';

const keysKeyPair = new UnaryCaller<
  ClientRPCRequestParams<PasswordMessage>,
  ClientRPCResponseResult<KeyPairMessage>
>();

class KeysKeyPairHandler extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  ClientRPCRequestParams<PasswordMessage>,
  ClientRPCResponseResult<KeyPairMessage>
> {
  public async handle(
    input: ClientRPCRequestParams<PasswordMessage>,
  ): Promise<ClientRPCResponseResult<KeyPairMessage>> {
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
