import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type KeyRing from '../../keys/KeyRing';
import type { PasswordMessage, PublicKeyMessage } from './types';
import * as keysUtils from '../../keys/utils/index';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const keysPublicKey = new UnaryCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult<PublicKeyMessage>
>();

class KeysPublicKeyHandler extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  ClientRPCRequestParams<PasswordMessage>,
  ClientRPCResponseResult<PublicKeyMessage>
> {
  public async handle(): Promise<ClientRPCResponseResult<PublicKeyMessage>> {
    const { keyRing } = this.container;
    const publicKeyJwk = keysUtils.publicKeyToJWK(keyRing.keyPair.publicKey);
    return {
      publicKeyJwk,
    };
  }
}

export { keysPublicKey, KeysPublicKeyHandler };
