import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type KeyRing from 'keys/KeyRing';
import type { PasswordMessage } from './types';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const keysPasswordChange = new UnaryCaller<
  ClientRPCRequestParams<PasswordMessage>,
  ClientRPCResponseResult
>();

class KeysPasswordChangeHandler extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  ClientRPCRequestParams<PasswordMessage>,
  ClientRPCResponseResult
> {
  public async handle(
    input: ClientRPCRequestParams<PasswordMessage>,
  ): Promise<ClientRPCResponseResult> {
    const { keyRing } = this.container;
    await keyRing.changePassword(input.password);
    return {};
  }
}

export { keysPasswordChange, KeysPasswordChangeHandler };
