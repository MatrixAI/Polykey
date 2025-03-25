import type { PermissionId, PermissionIdString } from '../ids/types.js';
import type { GestaltActions } from '../gestalts/types.js';
import type { VaultActions, VaultIdString } from '../vaults/types.js';

type Permission = {
  gestalt: GestaltActions;
  vaults: Record<VaultIdString, VaultActions>;
};

export type {
  PermissionId,
  PermissionIdString,
  Permission,
  GestaltActions,
  VaultActions,
};
