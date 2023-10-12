import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  IdentityMessage,
  TokenMessage,
} from '../types';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import type { IdentityId, ProviderId } from '../../ids/index';
import { UnaryHandler } from '@matrixai/rpc';
import { validateSync } from '../../validation/index';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils/index';

class IdentitiesTokenGet extends UnaryHandler<
  {
    db: DB;
    identitiesManager: IdentitiesManager;
  },
  ClientRPCRequestParams<IdentityMessage>,
  ClientRPCResponseResult<Partial<TokenMessage>>
> {
  public handle = async (
    input: ClientRPCRequestParams<IdentityMessage>,
  ): Promise<ClientRPCResponseResult<Partial<TokenMessage>>> => {
    const { identitiesManager, db } = this.container;
    const {
      providerId,
      identityId,
    }: {
      providerId: ProviderId;
      identityId: IdentityId;
    } = validateSync(
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
    const token = await db.withTransactionF((tran) =>
      identitiesManager.getToken(providerId, identityId, tran),
    );
    return {
      token,
    };
  };
}

export default IdentitiesTokenGet;
