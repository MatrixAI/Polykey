import type { PasswordMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type CertManager from '../../keys/CertManager';
import { UnaryHandler } from '@matrixai/rpc';

class KeysKeyPairRenewHandler extends UnaryHandler<
  {
    certManager: CertManager;
  },
  ClientRPCRequestParams<PasswordMessage>,
  ClientRPCResponseResult
> {
  public handle = async (
    input: ClientRPCRequestParams<PasswordMessage>,
  ): Promise<ClientRPCResponseResult> => {
    const { certManager } = this.container;

    // Other domains will be updated accordingly via the `EventBus` so we
    // only need to modify the KeyManager
    await certManager.renewCertWithNewKeyPair(input.password);

    return {};
  };
}

export { KeysKeyPairRenewHandler };
