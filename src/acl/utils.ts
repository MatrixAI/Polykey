import type { Permission, PermissionId, PermissionIdString } from "./types";

import base58 from 'bs58';
import { utils as keysUtils } from '../keys';
import { IdRandom } from "@matrixai/id";
import { VaultIdRaw } from "@/vaults/types";
import { makeVaultId } from "@/vaults/utils";
import { isRandomId, isRawRandomId, makeRandomId, makeRawRandomId } from "@/GenericIdTypes";

function isPermissionId(arg: any): arg is PermissionId {
  return isRawRandomId<PermissionId>(arg);
}

function makePermissionId(arg: any) {
  return makeRawRandomId<PermissionId>(arg);
}

function isPermissionIdString(arg: any): arg is PermissionIdString {
  return isRandomId<PermissionIdString>(arg);
}

function makePermissionIdString(arg: any) {
  return makeRandomId<PermissionIdString>(arg);
}

const randomIdGenerator = new IdRandom();
async function generatePermId(): Promise<PermissionId> {
  return makePermissionId(Buffer.from(randomIdGenerator.get()) as PermissionId);
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

export { generatePermId, permUnion, isPermissionId, makePermissionId, isPermissionIdString, makePermissionIdString };
