import type Vault from './Vault';

type VaultKey = Buffer;

type VaultKeys = { [key: string]: VaultKey };

type Vaults = { [key: string]: Vault };

type NodePermissions = {
  canPull: boolean;
};

type ACL = {
  [key: string]: NodePermissions;
};

type FileChange = {
  fileName: string;
  action: 'added' | 'modified' | 'removed';
};

type FileChanges = Array<FileChange>;

export type {
  VaultKey,
  VaultKeys,
  Vaults,
  NodePermissions,
  ACL,
  FileChange,
  FileChanges,
};
