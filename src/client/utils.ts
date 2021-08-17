import type { VaultId } from '../vaults/types';
import type { Session } from '../sessions';
import type { VaultManager } from '../vaults';
import type { SessionToken } from '../sessions/types';

import * as grpc from '@grpc/grpc-js';
import * as clientErrors from '../client/errors';

async function parseVaultInput(
  input: string,
  vaultManager: VaultManager,
): Promise<VaultId> {
  const id = await vaultManager.getVaultId(input);
  if (id) {
    return id;
  } else {
    return input as VaultId;
  }
}

/**
 * Gets Session token from metadata
 * @param meta
 * @returns
 */
function getToken(meta: grpc.Metadata): SessionToken {
  const auth = meta.get('Authorization').pop();
  if (!auth) {
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
  if (!auth) {
    return;
  }
  const token = auth.toString().split(' ')[1];
  await session.refresh(token as SessionToken);
}

function createMetaTokenResponse(token: SessionToken): grpc.Metadata {
  const meta = new grpc.Metadata();
  meta.set('Authorization', `Bearer: ${token}`);
  return meta;
}

export { parseVaultInput, getToken, refreshSession, createMetaTokenResponse };
