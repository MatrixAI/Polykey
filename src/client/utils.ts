import type { VaultId, VaultName } from "../vaults/types";
import type { Session } from '../sessions';
import type { VaultManager } from '../vaults';
import type { SessionToken } from '../sessions/types';

import * as grpc from '@grpc/grpc-js';
import * as clientErrors from '../client/errors';
import { VaultMessage } from '../proto/js/Client_pb';
import { ErrorInvalidVaultId, ErrorVaultUndefined } from "../vaults/errors";
import { makeVaultId } from '@/vaults/utils';

async function parseVaultInput(
  vaultMessage: VaultMessage,
  vaultManager: VaultManager,
): Promise<VaultId> {
  switch (vaultMessage.getNameOrIdCase()) {
    case VaultMessage.NameOrIdCase.VAULT_NAME: {
      const vaultId = (await vaultManager.getVaultId(
        vaultMessage.getVaultName() as VaultName,
      ));
      if (vaultId == null) throw new ErrorVaultUndefined();
      return vaultId;
    }
    case VaultMessage.NameOrIdCase.VAULT_ID: {
      return makeVaultId(vaultMessage.getVaultId_asU8());
    }
    case VaultMessage.NameOrIdCase.NAME_OR_ID_NOT_SET:
    default:
      throw new ErrorInvalidVaultId();
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
