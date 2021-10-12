import type { Opaque } from '../types';
import type { GestaltAction } from '../gestalts/types';
import type { VaultActions, VaultId } from "../vaults/types";

type PermissionId = Opaque<'PermissionId', string>;

type Permission = {
  gestalt: GestaltActions;
  vaults: Record<VaultId, VaultActions>;
};

type GestaltActions = Partial<Record<GestaltAction, null>>;

export type { PermissionId, Permission, GestaltActions, VaultActions };
