import type { Opaque } from '../types';
import type { GestaltAction } from '../gestalts/types';
import type { VaultActions, VaultId } from '../vaults/types';
import type { Id } from '@matrixai/id';

type PermissionId = Opaque<'PermissionId', Id>;
type PermissionIdString = Opaque<'PermissionIdString', string>;

type Permission = {
  gestalt: GestaltActions;
  vaults: Record<VaultId | string, VaultActions>; // FIXME: the string union on VaultId is to prevent some false errors.
};

type GestaltActions = Partial<Record<GestaltAction, null>>;

export type {
  PermissionId,
  PermissionIdString,
  Permission,
  GestaltActions,
  VaultActions,
};
