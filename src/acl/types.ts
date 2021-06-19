import type { Opaque, Ref } from '../types';
import type { NodeId } from '../nodes/types';
import type { VaultId, VaultAction } from '../vaults/types';

type PermissionId = Opaque<'PermissionId', string>;

type Permission = {
  trust: boolean;
  vaults: Record<VaultId, VaultActions>;
};

type VaultActions = Partial<Record<VaultAction, null>>;

type ACLOp_ =
  | {
      domain: 'perms';
      key: PermissionId;
      value: Ref<Permission>;
    }
  | {
      domain: 'nodes';
      key: NodeId;
      value: PermissionId;
    }
  | {
      domain: 'vaults';
      key: VaultId;
      value: Record<NodeId, null>;
    };

type ACLOp =
  | ({
      type: 'put';
    } & ACLOp_)
  | ({
      type: 'del';
    } & Omit<ACLOp_, 'value'>);

export { PermissionId, Permission, VaultActions, ACLOp };
