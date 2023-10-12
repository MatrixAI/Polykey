import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  IdentityMessage,
} from '../types';
import type { IdentityId, ProviderId } from '../../ids/index';
import type Discovery from '../../discovery/Discovery';
import { UnaryHandler } from '@matrixai/rpc';
import { validateSync } from '../../validation/index';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils/index';

class GestaltsDiscoveryByIdentity extends UnaryHandler<
  {
    discovery: Discovery;
  },
  ClientRPCRequestParams<IdentityMessage>,
  ClientRPCResponseResult
> {
  public handle = async (
    input: ClientRPCRequestParams<IdentityMessage>,
  ): Promise<ClientRPCResponseResult> => {
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
  };
}

export default GestaltsDiscoveryByIdentity;
