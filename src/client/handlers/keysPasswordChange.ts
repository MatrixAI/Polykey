import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type KeyRing from 'keys/KeyRing';
import type { PasswordMessage } from './types';
import { UnaryHandler } from '../../rpc/handlers';

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

export { KeysPasswordChangeHandler };
