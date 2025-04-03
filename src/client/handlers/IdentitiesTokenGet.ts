import type { DB } from '@matrixai/db';
import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  IdentityMessage,
  TokenMessage,
} from '../types.js';
import type IdentitiesManager from '../../identities/IdentitiesManager.js';
import type { IdentityId, ProviderId } from '../../ids/index.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as ids from '../../ids/index.js';
import { validateSync } from '../../validation/index.js';
import { matchSync } from '../../utils/index.js';

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
