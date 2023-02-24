import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { PasswordMessage } from './types';
import type CertManager from 'keys/CertManager';
import { UnaryHandler } from '../../RPC/handlers';
import { UnaryCaller } from '../../RPC/callers';

const keysKeyPairRenew = new UnaryCaller<
  RPCRequestParams<PasswordMessage>,
  RPCResponseResult
>();

class KeysKeyPairRenewHandler extends UnaryHandler<
  {
    certManager: CertManager;
  },
  RPCRequestParams<PasswordMessage>,
  RPCResponseResult
> {
  public async handle(
    input: RPCRequestParams<PasswordMessage>,
  ): Promise<RPCResponseResult> {
    const { certManager } = this.container;

    // Other domains will be updated accordingly via the `EventBus` so we
    // only need to modify the KeyManager
    await certManager.renewCertWithNewKeyPair(input.password);

    return {};
  }
}

export { keysKeyPairRenew, KeysKeyPairRenewHandler };
