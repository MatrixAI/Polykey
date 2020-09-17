/// <reference types="node" />
import { Duplex } from 'readable-stream';
import PeerInfo, { Address } from '../peers/PeerInfo';
import { agentInterface } from '../../proto/js/Agent';
declare class PolykeyClient {
    private getStream;
    constructor(getStream: () => Duplex);
    sendRequestToAgent(request: Uint8Array): Promise<Uint8Array[]>;
    private handleAgentCommunication;
    registerNode(path: string, passphrase: string): Promise<boolean>;
    newNode(path: string, userId: string, passphrase: string, nbits?: number): Promise<boolean>;
    listNodes(unlockedOnly?: boolean): Promise<string[]>;
    deriveKey(nodePath: string, keyName: string, passphrase: string): Promise<boolean>;
    deleteKey(nodePath: string, keyName: string): Promise<boolean>;
    listKeys(nodePath: string): Promise<string[]>;
    getKey(nodePath: string, keyName: string): Promise<string>;
    getPrimaryKeyPair(nodePath: string, includePrivateKey?: boolean): Promise<{
        publicKey: string;
        privateKey: string;
    }>;
    signFile(nodePath: string, filePath: string, privateKeyPath?: string, passphrase?: string): Promise<string>;
    verifyFile(nodePath: string, filePath: string, publicKeyPath?: string): Promise<boolean>;
    encryptFile(nodePath: string, filePath: string, publicKeyPath?: string): Promise<string>;
    decryptFile(nodePath: string, filePath: string, privateKeyPath?: string, passphrase?: string): Promise<string>;
    listVaults(nodePath: string): Promise<string[]>;
    scanVaultNames(nodePath: string, publicKey: string): Promise<string[]>;
    newVault(nodePath: string, vaultName: string): Promise<boolean>;
    pullVault(nodePath: string, vaultName: string, publicKey: string): Promise<boolean>;
    destroyVault(nodePath: string, vaultName: string): Promise<boolean>;
    listSecrets(nodePath: string, vaultName: string): Promise<string[]>;
    createSecret(nodePath: string, vaultName: string, secretName: string, secret: string | Buffer): Promise<boolean>;
    destroySecret(nodePath: string, vaultName: string, secretName: string): Promise<boolean>;
    getSecret(nodePath: string, vaultName: string, secretName: string): Promise<Buffer>;
    updateSecret(nodePath: string, vaultName: string, secretName: string, secret: string | Buffer): Promise<boolean>;
    addPeer(nodePath: string, publicKey?: string, peerAddress?: string, relayPublicKey?: string): Promise<boolean>;
    getPeerInfo(nodePath: string, current?: boolean, publicKey?: string): Promise<PeerInfo>;
    pingPeer(nodePath: string, publicKey: string, timeout?: number): Promise<boolean>;
    findPeer(nodePath: string, publicKey: string, timeout?: number): Promise<boolean>;
    findSocialPeer(nodePath: string, handle: string, service: string, timeout?: number): Promise<boolean>;
    listPeers(nodePath: string): Promise<string[]>;
    toggleStealth(nodePath: string, active: boolean): Promise<boolean>;
    updatePeer(nodePath: string, publicKey?: string, currentNode?: boolean, peerHost?: string, peerPort?: number, relayPublicKey?: string): Promise<boolean>;
    requestRelay(nodePath: string, publicKey: string): Promise<boolean>;
    requestPunch(nodePath: string, publicKey: string): Promise<Address>;
    getAgentStatus(): Promise<agentInterface.AgentStatusType>;
    stopAgent(): Promise<boolean>;
}
export default PolykeyClient;
