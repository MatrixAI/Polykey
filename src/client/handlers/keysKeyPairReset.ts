import type { RPCRequestParams, RPCResponseResult } from '../types';
import type CertManager from 'keys/CertManager';
import type { PasswordMessage } from './types';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const keysKeyPairReset = new UnaryCaller<
  RPCRequestParams<PasswordMessage>,
  RPCResponseResult
>();

class KeysKeyPairResethandler extends UnaryHandler<
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
    await certManager.resetCertWithNewKeyPair(input.password);
    return {};
  }
}

export { keysKeyPairReset, KeysKeyPairResethandler };
