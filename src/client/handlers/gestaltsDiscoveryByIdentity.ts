import type { RPCRequestParams, RPCResponseResult } from '../types';
import type { IdentityId, ProviderId } from 'ids/index';
import type Discovery from '../../discovery/Discovery';
import type { IdentityMessage } from 'client/handlers/types';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';
import { validateSync } from '../../validation/index';
import { matchSync } from '../../utils/index';
import * as validationUtils from '../../validation/utils';

const gestaltsDiscoveryByIdentity = new UnaryCaller<
  RPCRequestParams<IdentityMessage>,
  RPCResponseResult
>();

class GestaltsDiscoveryByIdentityHandler extends UnaryHandler<
  {
    discovery: Discovery;
  },
  RPCRequestParams<IdentityMessage>,
  RPCResponseResult
> {
  public async handle(
    input: RPCRequestParams<IdentityMessage>,
  ): Promise<RPCResponseResult> {
    const { discovery } = this.container;
    const {
      providerId,
      identityId,
    }: { providerId: ProviderId; identityId: IdentityId } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['providerId'], () => validationUtils.parseProviderId(value)],
          [['identityId'], () => validationUtils.parseIdentityId(value)],
          () => value,
        );
      },
      {
        providerId: input.providerId,
        identityId: input.identityId,
      },
    );

    await discovery.queueDiscoveryByIdentity(providerId, identityId);

    return {};
  }
}

export { gestaltsDiscoveryByIdentity, GestaltsDiscoveryByIdentityHandler };
