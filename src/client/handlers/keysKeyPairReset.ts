import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type CertManager from 'keys/CertManager';
import type { PasswordMessage } from './types';
import { UnaryHandler } from '../../rpc/handlers';

class KeysKeyPairResethandler extends UnaryHandler<
  {
    certManager: CertManager;
  },
  ClientRPCRequestParams<PasswordMessage>,
  ClientRPCResponseResult
> {
  public async handle(
    input: ClientRPCRequestParams<PasswordMessage>,
  ): Promise<ClientRPCResponseResult> {
    const { certManager } = this.container;
    // Other domains will be updated accordingly via the `EventBus` so we
    // only need to modify the KeyManager
    await certManager.resetCertWithNewKeyPair(input.password);
    return {};
  }
}

export { KeysKeyPairResethandler };
