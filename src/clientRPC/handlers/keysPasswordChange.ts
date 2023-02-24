import type { RPCRequestParams, RPCResponseResult } from '../types';
import type KeyRing from 'keys/KeyRing';
import type { PasswordMessage } from './types';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const keysPasswordChange = new UnaryCaller<
  RPCRequestParams<PasswordMessage>,
  RPCResponseResult
>();

class KeysPasswordChangeHandler extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  RPCRequestParams<PasswordMessage>,
  RPCResponseResult
> {
  public async handle(
    input: RPCRequestParams<PasswordMessage>,
  ): Promise<RPCResponseResult> {
    const { keyRing } = this.container;
    await keyRing.changePassword(input.password);
    return {};
  }
}

export { keysPasswordChange, KeysPasswordChangeHandler };
