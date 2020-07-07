/// <reference types="node" />
import fs from 'fs';
import Vault from '../vaults/Vault';
import GitClient from '../git/GitClient';
import KeyManager from '../keys/KeyManager';
declare class VaultManager {
    polykeyPath: string;
    fileSystem: typeof fs;
    keyManager: KeyManager;
    metadataPath: string;
    vaults: Map<string, Vault>;
    vaultKeys: Map<string, Buffer>;
    constructor(polykeyPath: string | undefined, fileSystem: typeof fs, keyManager: KeyManager);
    /**
     * Get a vault from the vault manager
     * @param vaultName Name of desired vault
     */
    getVault(vaultName: string): Vault;
    /**
     * Get a vault from the vault manager
     * @param vaultName Unique name of new vault
     * @param key Optional key to use for the vault encryption, otherwise it is generated
     */
    createVault(vaultName: string, key?: Buffer): Promise<Vault>;
    /**
     * Get a vault from the vault manager
     * @param vaultName Name of vault to be cloned
     * @param address Address of polykey node that owns vault to be cloned
     * @param getSocket Function to get an active connection to provided address
     */
    cloneVault(vaultName: string, gitClient: GitClient): Promise<Vault>;
    /**
     * Determines whether the vault exists
     * @param vaultName Name of desired vault
     */
    vaultExists(vaultName: string): boolean;
    /**
     * [WARNING] Destroys a certain vault and all its secrets
     * @param vaultName Name of vault to be destroyed
     */
    destroyVault(vaultName: string): void;
    /**
     * List the names of all vaults in memory
     */
    listVaults(): string[];
    private validateVault;
    private writeMetadata;
    private loadMetadata;
}
export default VaultManager;
