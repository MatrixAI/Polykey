import type { Permission, PermissionId } from './types';
import { IdRandom } from '@matrixai/id';

function createPermIdGenerator() {
  const generator = new IdRandom<PermissionId>();
  return () => generator.get();
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

export { createPermIdGenerator, permUnion };
