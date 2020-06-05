import Vault from "@polykey/VaultStore/Vault";

// Capability
// needs address to object and what can be done to object
// only owner can create capabilities
// 'god complex' class creates crypto tokens that represent capabilities
// address: pubkey + content address (hash of vault? or commit hash)
// any agent can construct this capability with the above address for internal or external vaults

class VaultStore {
  private vaults:Map<string, Vault>
  private vaultShareMap:Map<string, Set<string>> // Access control list
  constructor() {
    this.vaults = new Map()
    this.vaultShareMap = new Map()
  }

  // Here is where we keep track of vaults themselves
  public setVault(name: string, vault: Vault) {
    this.vaults.set(name, vault)
  }
  public getVault(name: string): Vault | undefined {
    return this.vaults.get(name)
  }
  public hasVault(name: string): boolean {
    return this.vaults.has(name)
  }
  public deleteVault(name: string): boolean {
    return this.vaults.delete(name) && this.vaultShareMap.delete(name)
  }
  public getVaultNames(): string[] {
    return Array.from(this.vaults.keys())
  }

  // Here is where we keep track of vault sharing
  public shareVault(name: string, publicKey: string) {
    if (!this.hasVault(name)) {
      throw(new Error('Vault does not exist in store'))
    }
    const sharingPeers = this.vaultShareMap.get(name) ?? new Set()
    this.vaultShareMap.set(name, sharingPeers.add(publicKey))
  }

  // Here is where we keep track of vault sharing
  public unshareVault(name: string, publicKey: string) {
    if (!this.hasVault(name)) {
      throw(new Error('Vault does not exist in store'))
    }
    const sharingPeers = this.vaultShareMap.get(name) ?? new Set()

    if (!sharingPeers.delete(publicKey)) {
      throw(new Error('Vault could not be unshared from user.'))
    }
    this.vaultShareMap.set(name, sharingPeers)
  }
}

export default VaultStore
