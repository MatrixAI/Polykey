import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  PasswordMessage,
} from '../types';
import type KeyRing from '../../keys/KeyRing';
import { UnaryHandler } from '@matrixai/rpc';

class KeysPasswordChange extends UnaryHandler<
  {
    keyRing: KeyRing;
  },
  ClientRPCRequestParams<PasswordMessage>,
  ClientRPCResponseResult
> {
  public handle = async (
    input: ClientRPCRequestParams<PasswordMessage>,
  ): Promise<ClientRPCResponseResult> => {
    const { keyRing }: { keyRing: KeyRing } = this.container;
    await keyRing.changePassword(input.password);
    return {};
  };
}

export default KeysPasswordChange;
