import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  IdentityMessage,
  TokenMessage,
} from '../types';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import type { IdentityId, ProviderId } from '../../ids';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';

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
    const {
      db,
      identitiesManager,
    }: { db: DB; identitiesManager: IdentitiesManager } = this.container;
    const {
      providerId,
      identityId,
    }: {
      providerId: ProviderId;
      identityId: IdentityId;
    } = validateSync(
      (keyPath, value) => {
        return matchSync(keyPath)(
          [['providerId'], () => ids.parseProviderId(value)],
          [['identityId'], () => ids.parseIdentityId(value)],
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
