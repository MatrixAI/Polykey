import type { PermissionId, PermissionIdString } from '../ids/types';
import type { GestaltAction } from '../gestalts/types';
import type { VaultActions, VaultIdString } from '../vaults/types';

type Permission = {
  gestalt: GestaltActions;
  vaults: Record<VaultIdString, VaultActions>;
};

type GestaltActions = Partial<Record<GestaltAction, null>>;

export type {
  PermissionId,
  PermissionIdString,
  Permission,
  GestaltActions,
  VaultActions,
};
