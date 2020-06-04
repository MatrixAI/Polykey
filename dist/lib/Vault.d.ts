/// <reference types="node" />
declare class Vault {
    private key;
    private keyLen;
    name: string;
    private fs;
    private secrets;
    private vaultPath;
    constructor(name: string, symKey: Buffer, baseDir: string);
    loadSecrets(): void;
    genSymKey(asymKey: Buffer, keyLen: number): Buffer;
    secretExists(secretName: string): boolean;
    addSecret(secretName: string, secretBuf: Buffer): void;
    getSecret(secretName: string): Buffer | string;
    removeSecret(secretName: string): void;
    listSecrets(): string[];
    tagVault(): void;
    untagVault(): void;
    shareVault(): void;
    unshareVault(): void;
}
export default Vault;
