import type { VaultId, VaultName } from '../vaults/types';
import type { Session } from '../sessions';
import type { VaultManager } from '../vaults';
import type { SessionToken } from '../sessions/types';

import * as grpc from '@grpc/grpc-js';
import * as clientErrors from '../client/errors';
import { ErrorVaultUndefined } from '../vaults/errors';
import { makeVaultId } from '../vaults/utils';
import { ErrorInvalidId } from '../errors';
import { messages } from '../client';

async function parseVaultInput(
  vaultMessage: messages.vaults.Vault,
  vaultManager: VaultManager,
): Promise<VaultId> {
  const vaultNameOrid = vaultMessage.getNameOrId();
  // Check if it is an existing vault name.
  const possibleVaultId = await vaultManager.getVaultId(
    vaultNameOrid as VaultName,
  );
  if (possibleVaultId != null) return possibleVaultId;

  // Check if it is an existing vault Id.
  try {
    const tempVaultId = makeVaultId(vaultNameOrid);
    const possibleVaultName = await vaultManager.getVaultName(tempVaultId);
    if (possibleVaultName != null) return tempVaultId;
  } catch (err) {
    if (!(err instanceof ErrorInvalidId)) throw err;
    // Else do nothing.
  }
  // It does not exist, throwing error.
  throw new ErrorVaultUndefined('Vault was not found.');
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
