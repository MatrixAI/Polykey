import type { CertMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type CertManager from '../../keys/CertManager';
import { ServerHandler } from '@matrixai/rpc/dist/handlers';

class KeysCertsChainGetHandler extends ServerHandler<
  {
    certManager: CertManager;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<CertMessage>
> {
  public async *handle(
    _input,
    _cancel,
    _meta,
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
