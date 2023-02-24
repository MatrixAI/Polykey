import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { CertMessage } from './types';
import type CertManager from 'keys/CertManager';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const keysCertsGet = new UnaryCaller<
  RPCRequestParams,
  RPCResponseResult<CertMessage>
>();

class KeysCertsGetHandler extends UnaryHandler<
  {
    certManager: CertManager;
  },
  RPCRequestParams,
  RPCResponseResult<CertMessage>
> {
  public async handle(): Promise<RPCResponseResult<CertMessage>> {
    const { certManager } = this.container;
    const cert = await certManager.getCurrentCertPEM();
    return {
      cert,
    };
  }
}

export { keysCertsGet, KeysCertsGetHandler };
