import type { Opaque } from '../types';
import type { GestaltActions } from '../gestalts/types';
import type { VaultId, VaultAction } from '../vaults/types';

type PermissionId = Opaque<'PermissionId', string>;

type Permission = {
  gestalt: GestaltActions;
  vaults: Record<VaultId, VaultActions>;
};

type VaultActions = Partial<Record<VaultAction, null>>;

export type { PermissionId, Permission, GestaltActions, VaultActions };
