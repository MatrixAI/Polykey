/// <reference types="node" />
import GitClient from '../git/GitClient';
import { EncryptedFS } from 'encryptedfs';
declare class Vault {
    private key;
    private keyLen;
    name: string;
    private efs;
    vaultPath: string;
    private secrets;
    private sharedPubKeys;
    private metadataPath;
    constructor(name: string, symKey: Buffer, baseDir: string);
    /**
     * Returns the Encrypted File System used for vault operations
     */
    get EncryptedFS(): EncryptedFS;
    /**
     * Determines whether a secret exists in the vault
     * @param secretName Name of desired secret
     */
    secretExists(secretName: string): boolean;
    /**
     * Adds a secret to the vault
     * @param secretName Name of new secret
     * @param secret Content of new secret
     */
    addSecret(secretName: string, secret: Buffer): Promise<void>;
    /**
     * Updates a secret in the vault
     * @param secretName Name of secret to be updated
     * @param secret Content of updated secret
     */
    updateSecret(secretName: string, secret: Buffer): Promise<void>;
    /**
     * Get a secret from the vault
     * @param secretName Name of secret to be retrieved
     */
    getSecret(secretName: string): Buffer | string;
    /**
     * [WARNING] Removes a secret from the vault
     * @param secretName Name of secret to be removed
     */
    removeSecret(secretName: string): Promise<void>;
    /**
     * Lists all the secrets currently in the vault
     */
    listSecrets(): string[];
    tagVault(): void;
    untagVault(): void;
    /**
     * Allows a particular public key to access the vault
     * @param publicKey Public key to share with
     */
    shareVault(publicKey: string): void;
    /**
     * Removes access to the vault for a particular public key
     * @param publicKey Public key to unshare with
     */
    unshareVault(publicKey: string): void;
    /**
     * Determines if a particular public key can access the vault
     * @param publicKey Public key to check
     */
    peerCanAccess(publicKey: string): boolean;
    /**
     * Pulls the vault from a specific address
     * @param address Address of polykey node that owns vault to be pulled
     * @param getSocket Function to get an active connection to provided address
     */
    pullVault(gitClient: GitClient): Promise<void>;
    /**
     * Initializes the git repository for new vaults
     */
    initRepository(): Promise<void>;
    private writeMetadata;
    private loadMetadata;
    private commitChanges;
    private loadSecrets;
}
export default Vault;
