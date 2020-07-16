/// <reference types="node" />
import { PassThrough } from 'readable-stream';
declare class PolykeyClient {
    private getStream;
    constructor(getStream: () => PassThrough);
    sendRequestToAgent(request: Uint8Array): Promise<Uint8Array[]>;
    private handleAgentCommunication;
    registerNode(path: string, passphrase: string): Promise<boolean>;
    newNode(path: string, name: string, email: string, passphrase: string, nbits?: number): Promise<boolean>;
    listNodes(unlockedOnly?: boolean): Promise<string[]>;
    deriveKey(nodePath: string, keyName: string, passphrase: string): Promise<boolean>;
    signFile(nodePath: string, filePath: string, privateKeyPath?: string, passphrase?: string): Promise<string>;
    verifyFile(nodePath: string, filePath: string, signaturePath?: string): Promise<boolean>;
    listVaults(nodePath: string): Promise<string[]>;
    newVault(nodePath: string, vaultName: string): Promise<boolean>;
    destroyVault(nodePath: string, vaultName: string): Promise<boolean>;
    listSecrets(nodePath: string, vaultName: string): Promise<string[]>;
    createSecret(nodePath: string, vaultName: string, secretName: string, secretPath: string): Promise<boolean>;
    destroySecret(nodePath: string, vaultName: string, secretName: string): Promise<boolean>;
    getSecret(nodePath: string, vaultName: string, secretName: string): Promise<Buffer>;
    getAgentStatus(): Promise<string>;
    stopAgent(): Promise<boolean>;
}
export default PolykeyClient;
