/// <reference types="node" />
import { Duplex } from 'readable-stream';
declare class PolykeyClient {
    private getStream;
    constructor(getStream: () => Duplex);
    sendRequestToAgent(request: Uint8Array): Promise<Uint8Array[]>;
    private handleAgentCommunication;
    registerNode(path: string, passphrase: string): Promise<boolean>;
    newNode(path: string, name: string, email: string, passphrase: string, nbits?: number): Promise<boolean>;
    listNodes(unlockedOnly?: boolean): Promise<string[]>;
    deriveKey(nodePath: string, keyName: string, passphrase: string): Promise<boolean>;
    listKeys(nodePath: string): Promise<string[]>;
    getKey(nodePath: string, keyName: string): Promise<string>;
    getPrimaryKeyPair(nodePath: string, includePrivateKey?: boolean): Promise<{
        publicKey: string;
        privateKey: string;
    }>;
    signFile(nodePath: string, filePath: string, privateKeyPath?: string, passphrase?: string): Promise<string>;
    verifyFile(nodePath: string, filePath: string, signaturePath?: string): Promise<boolean>;
    encryptFile(nodePath: string, filePath: string, publicKeyPath?: string): Promise<string>;
    decryptFile(nodePath: string, filePath: string, privateKeyPath?: string, passphrase?: string): Promise<string>;
    listVaults(nodePath: string): Promise<string[]>;
    newVault(nodePath: string, vaultName: string): Promise<boolean>;
    destroyVault(nodePath: string, vaultName: string): Promise<boolean>;
    listSecrets(nodePath: string, vaultName: string): Promise<string[]>;
    createSecret(nodePath: string, vaultName: string, secretName: string, secret: string | Buffer): Promise<boolean>;
    destroySecret(nodePath: string, vaultName: string, secretName: string): Promise<boolean>;
    getSecret(nodePath: string, vaultName: string, secretName: string): Promise<Buffer>;
    getAgentStatus(): Promise<string>;
    stopAgent(): Promise<boolean>;
}
export default PolykeyClient;
