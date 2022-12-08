import type { PermissionId, PermissionIdString } from '../ids/types';
import type { GestaltActions } from '../gestalts/types';
import type { VaultActions, VaultIdString } from '../vaults/types';

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
