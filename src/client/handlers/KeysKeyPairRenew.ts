import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  PasswordMessage,
} from '../types.js';
import type CertManager from '../../keys/CertManager.js';
import { UnaryHandler } from '@matrixai/rpc';

class KeysKeyPairRenew extends UnaryHandler<
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
    await certManager.renewCertWithNewKeyPair(input.password);
    return {};
  };
}

export default KeysKeyPairRenew;
