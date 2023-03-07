import type { RPCRequestParams, RPCResponseResult } from '../types';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';

const identitiesProvidersList = new UnaryCaller<
  RPCRequestParams,
  RPCResponseResult<{
    providerIds: Array<string>;
  }>
>();

class IdentitiesProvidersListHandler extends UnaryHandler<
  {
    identitiesManager: IdentitiesManager;
  },
  RPCRequestParams,
  RPCResponseResult<{
    providerIds: Array<string>;
  }>
> {
  public async handle(): Promise<
    RPCResponseResult<{
      providerIds: Array<string>;
    }>
  > {
    const { identitiesManager } = this.container;
    const providers = identitiesManager.getProviders();
    return {
      providerIds: Object.keys(providers),
    };
  }
}

export { identitiesProvidersList, IdentitiesProvidersListHandler };
