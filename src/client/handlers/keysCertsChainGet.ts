import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { CertMessage } from './types';
import type CertManager from 'keys/CertManager';
import { ServerHandler } from '../../rpc/handlers';

class KeysCertsChainGetHandler extends ServerHandler<
  {
    certManager: CertManager;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<CertMessage>
> {
  public async *handle(
    _input,
    _connectionInfo,
    ctx,
  ): AsyncGenerator<ClientRPCResponseResult<CertMessage>> {
    const { certManager } = this.container;
    for (const certPEM of await certManager.getCertPEMsChain()) {
      if (ctx.signal.aborted) throw ctx.signal.reason;
      yield {
        cert: certPEM,
      };
    }
  }
}

export { KeysCertsChainGetHandler };
