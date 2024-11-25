import type VaultInternal from './VaultInternal';

interface Vault {
  vaultDataDir: VaultInternal['vaultDataDir'];
  vaultGitDir: VaultInternal['vaultGitDir'];
  vaultId: VaultInternal['vaultId'];
  writeF: VaultInternal['writeF'];
  writeG: VaultInternal['writeG'];
  readF: VaultInternal['readF'];
  readG: VaultInternal['readG'];
  acquireRead: VaultInternal['acquireRead'];
  acquireWrite: VaultInternal['acquireWrite'];
  log: VaultInternal['log'];
  version: VaultInternal['version'];
}

export type { Vault };
