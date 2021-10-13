import type { Opaque } from '../types';
import type { GestaltAction } from '../gestalts/types';
import type { VaultActions, VaultId } from "../vaults/types";
import { RandomId, RawRandomId } from "../GenericIdTypes";

type PermissionId = Buffer;//Opaque<'PermissionId', RawRandomId>;

type PermissionIdString = Opaque<'PermissionIdString', RandomId>;

type Permission = {
  gestalt: GestaltActions;
  vaults: Record<VaultId | string, VaultActions>; // FIXME: the string union on VaultId is to prevent some false errors.
};

type GestaltActions = Partial<Record<GestaltAction, null>>;

export type { PermissionId, PermissionIdString, Permission, GestaltActions, VaultActions };
