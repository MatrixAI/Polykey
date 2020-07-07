/// <reference types="node" />
import VaultManager from '../vaults/VaultManager';
declare class GitBackend {
    private polykeyPath;
    private vaultManager;
    constructor(polykeyPath: string, vaultManager: VaultManager);
    /**
     * Find out whether vault exists.
     * @param vaultName Name of vault to check
     * @param publicKey Public key of peer trying to access vault
     */
    private exists;
    handleInfoRequest(vaultName: string): Promise<Buffer>;
    handlePackRequest(vaultName: string, body: Buffer): Promise<Buffer>;
    private createGitPacketLine;
}
export default GitBackend;
