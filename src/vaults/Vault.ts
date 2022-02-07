import type VaultInternal from './VaultInternal';
import type { CommitType, AccessType, LogType, VersionType } from './types';

interface Vault {
  baseDir: VaultInternal['baseDir'];
  gitDir: VaultInternal['gitDir'];
  vaultId: VaultInternal['vaultId'];
  commit(...arg: Parameters<CommitType>): ReturnType<CommitType>;
  access: AccessType;
  log(...arg: Parameters<LogType>): ReturnType<LogType>;
  version(...arg: Parameters<VersionType>): ReturnType<VersionType>;
}

export type { Vault };
