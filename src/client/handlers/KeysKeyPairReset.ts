import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  PasswordMessage,
} from '../types';
import type CertManager from '../../keys/CertManager';
import { UnaryHandler } from '@matrixai/rpc';

class KeysKeyPairReset extends UnaryHandler<
  {
    certManager: CertManager;
  },
  ClientRPCRequestParams<PasswordMessage>,
  ClientRPCResponseResult
> {
  public handle = async (
    input: ClientRPCRequestParams<PasswordMessage>,
  ): Promise<ClientRPCResponseResult> => {
    const { certManager }: { certManager: CertManager } = this.container;
    // Other domains will be updated accordingly via the `EventBus` so we
    // only need to modify the KeyManager
    await certManager.resetCertWithNewKeyPair(input.password);
    return {};
  };
}

export default KeysKeyPairReset;
