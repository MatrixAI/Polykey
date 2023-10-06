import type { DB } from '@matrixai/db';
import type { IdentityMessage, TokenMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import type { IdentityId, ProviderId } from '../../ids/index';
import { UnaryHandler } from '@matrixai/rpc/dist/handlers';
import { validateSync } from '../../validation/index';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils/index';

class IdentitiesTokenPutHandler extends UnaryHandler<
  {
    db: DB;
    identitiesManager: IdentitiesManager;
  },
  ClientRPCRequestParams<IdentityMessage & TokenMessage>,
  ClientRPCResponseResult
> {
  public handle = async(
    input: ClientRPCRequestParams<IdentityMessage & TokenMessage>,
  ): Promise<ClientRPCResponseResult> => {
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
    await db.withTransactionF((tran) =>
      identitiesManager.putToken(providerId, identityId, input.token, tran),
    );
    return {};
  }
}

export { IdentitiesTokenPutHandler };
