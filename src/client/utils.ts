import type { VaultId, VaultName } from '../vaults/types';
import type { Session } from '../sessions';
import type { VaultManager } from '../vaults';
import type { SessionToken } from '../sessions/types';

import * as grpc from '@grpc/grpc-js';
import * as clientErrors from '../client/errors';
import { VaultMessage } from '../proto/js/Client_pb';

async function parseVaultInput(
  vaultMessage: VaultMessage,
  vaultManager: VaultManager,
): Promise<VaultId> {
  switch (vaultMessage.getNameOrIdCase()) {
    case VaultMessage.NameOrIdCase.VAULT_NAME: {
      return (await vaultManager.getVaultId(
        vaultMessage.getVaultName() as VaultName,
      )) as VaultId;
    }
    case VaultMessage.NameOrIdCase.VAULT_ID: {
      return vaultMessage.getVaultId() as VaultId;
    }
    case VaultMessage.NameOrIdCase.NAME_OR_ID_NOT_SET:
    default:
      return '' as VaultId;
  }
}

/**
 * Gets Session token from metadata
 * @param meta
 * @returns
 */
function getToken(meta: grpc.Metadata): SessionToken {
  const auth = meta.get('Authorization').pop();
  if (auth == null) {
    throw new clientErrors.ErrorClientJWTTokenNotProvided();
  }
  const token = auth.toString().split(' ')[1];
  return token as SessionToken;
}

/**
 * Refresh the client session.
 */
async function refreshSession(
  meta: grpc.Metadata,
  session: Session,
): Promise<void> {
  const auth = meta.get('Authorization').pop();
  if (auth == null) {
    return;
  }
  const token = auth.toString().split('Bearer: ')[1];
  await session.refresh(token as SessionToken);
}

function createMetaTokenResponse(token: SessionToken): grpc.Metadata {
  const meta = new grpc.Metadata();
  meta.set('Authorization', `Bearer: ${token}`);
  return meta;
}

export { parseVaultInput, getToken, refreshSession, createMetaTokenResponse };
