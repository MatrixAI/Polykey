import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import type { IdentityMessage } from './types';
import type { DB } from '@matrixai/db';
import type { TokenMessage } from './types';
import type { IdentityId, ProviderId } from 'ids/index';
import { UnaryCaller } from '../../RPC/callers';
import { UnaryHandler } from '../../RPC/handlers';
import { validateSync } from '../../validation/index';
import { matchSync } from '../../utils/index';
import * as validationUtils from '../../validation/utils';

const identitiesTokenGet = new UnaryCaller<
  ClientRPCRequestParams<IdentityMessage>,
  ClientRPCResponseResult<Partial<TokenMessage>>
>();

class IdentitiesTokenGetHandler extends UnaryHandler<
  {
    db: DB;
    identitiesManager: IdentitiesManager;
  },
  ClientRPCRequestParams<IdentityMessage>,
  ClientRPCResponseResult<Partial<TokenMessage>>
> {
  public async handle(
    input: ClientRPCRequestParams<IdentityMessage>,
  ): Promise<ClientRPCResponseResult<Partial<TokenMessage>>> {
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
  }
}

export { identitiesTokenGet, IdentitiesTokenGetHandler };
