import type { Opaque } from '../types';
import type { GestaltAction } from '../gestalts/types';
import type { VaultActions, VaultIdString } from '../vaults/types';
import type { Id } from '@matrixai/id';

type PermissionId = Opaque<'PermissionId', Id>;
type PermissionIdString = Opaque<'PermissionIdString', string>;

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
