import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { CertMessage } from './types';
import type CertManager from 'keys/CertManager';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const keysCertsGet = new UnaryCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult<CertMessage>
>();

class KeysCertsGetHandler extends UnaryHandler<
  {
    certManager: CertManager;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<CertMessage>
> {
  public async handle(): Promise<ClientRPCResponseResult<CertMessage>> {
    const { certManager } = this.container;
    const cert = await certManager.getCurrentCertPEM();
    return {
      cert,
    };
  }
}

export { keysCertsGet, KeysCertsGetHandler };
