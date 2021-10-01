import type VaultInternal from './VaultInternal';
import type { Opaque } from '../types';
import type { NodeId } from '@/nodes/types';
import type { MutexInterface } from 'async-mutex';

/**
 * Randomly generated vault ID for each new vault
 */
type VaultId = Opaque<'VaultId', string>;

/**
 * Actions relating to what is possible with vaults
 */
type VaultAction = 'clone' | 'pull';

type VaultKey = Buffer;

type VaultName = string;

type VaultList = string[];

type SecretName = string;

type SecretList = string[];

/**
 * Map vaultId -> Vault
 */
type Vaults = {
  [vaultId: string]: VaultInternal;
};

type VaultMap = Map<VaultId, {
  vault?: VaultInternal;
  lock: MutexInterface;
}>;

type VaultPermissions = Record<NodeId, VaultAction>;

type FileChange = {
  fileName: string;
  action: 'added' | 'modified' | 'removed';
};

type FileChanges = Array<FileChange>;

type FileOptions = {
  recursive?: boolean;
};

type VaultMapOp_ =
  | {
      domain: 'vaults';
      key: VaultId;
      value: Buffer;
    }
  | {
      domain: 'names';
      key: string;
      value: VaultId;
    }
  | {
      domain: 'links';
      key: VaultId;
      value: string;
    };

type VaultMapOp =
  | ({
      type: 'put';
    } & VaultMapOp_)
  | ({
      type: 'del';
    } & Omit<VaultMapOp_, 'value'>);

type VaultActions = Partial<Record<VaultAction, null>>;

export type {
  VaultId,
  VaultAction,
  VaultKey,
  VaultName,
  VaultList,
  VaultMap,
  Vaults,
  VaultPermissions,
  FileChange,
  FileChanges,
  VaultMapOp,
  VaultActions,
  SecretName,
  SecretList,
  FileOptions,
};
