import type { Permission, PermissionId, PermissionIdString } from './types';

import { IdRandom } from '@matrixai/id';
import { isIdString, isId, makeIdString, makeId } from '../GenericIdTypes';

function isPermissionId(arg: any): arg is PermissionId {
  return isId<PermissionId>(arg);
}

function makePermissionId(arg: any) {
  return makeId<PermissionId>(arg);
}

function isPermissionIdString(arg: any): arg is PermissionIdString {
  return isIdString<PermissionIdString>(arg);
}

function makePermissionIdString(arg: any) {
  return makeIdString<PermissionIdString>(arg);
}

const randomIdGenerator = new IdRandom();
async function generatePermId(): Promise<PermissionId> {
  return makePermissionId(randomIdGenerator.get());
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

export {
  generatePermId,
  permUnion,
  isPermissionId,
  makePermissionId,
  isPermissionIdString,
  makePermissionIdString,
};
