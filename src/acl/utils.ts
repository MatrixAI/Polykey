import type { Permission, PermissionId } from './types';

import base58 from 'bs58';
import { utils as keysUtils } from '../keys';

async function generatePermId(): Promise<PermissionId> {
  const id = await keysUtils.getRandomBytes(32);
  return base58.encode(id) as PermissionId;
}

function permUnion(perm1: Permission, perm2: Permission): Permission {
  const vaults = {
    ...perm1.vaults,
    ...perm2.vaults,
  };
  for (const vaultId in perm1.vaults) {
    if (vaultId in perm2.vaults) {
      vaults[vaultId] = {
        ...perm1.vaults[vaultId],
        ...perm2.vaults[vaultId],
      };
    }
  }
  const perm = {
    gestalt: { ...perm1.gestalt, ...perm2.gestalt },
    vaults,
  };
  return perm;
}

export { generatePermId, permUnion };
