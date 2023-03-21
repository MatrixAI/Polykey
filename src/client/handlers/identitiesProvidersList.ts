import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import { UnaryCaller } from '../../rpc/callers';
import { UnaryHandler } from '../../rpc/handlers';

const identitiesProvidersList = new UnaryCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult<{
    providerIds: Array<string>;
  }>
>();

class IdentitiesProvidersListHandler extends UnaryHandler<
  {
    identitiesManager: IdentitiesManager;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<{
    providerIds: Array<string>;
  }>
> {
  public async handle(): Promise<
    ClientRPCResponseResult<{
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
