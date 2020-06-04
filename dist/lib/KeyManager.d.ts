/// <reference types="node" />
import { Pool, ModuleThread } from 'threads';
import { KeyManagerWorker } from '@polykey/KeyManagerWorker';
declare type KeyPair = {
    private: string;
    public: string;
    passphrase: string;
};
declare class KeyManager {
    private primaryKeyPair;
    private primaryPassphrase?;
    private primaryIdentity?;
    private derivedKeys;
    private useWebWorkers;
    private workerPool?;
    storePath: string;
    constructor(polyKeyPath?: string, useWebWorkers?: boolean, workerPool?: Pool<ModuleThread<KeyManagerWorker>>);
    generateKeyPair(name: string, email: string, passphrase: string, replacePrimary?: boolean, progressCallback?: (info: any) => void): Promise<KeyPair>;
    getKeyPair(): KeyPair;
    getPublicKey(): string;
    getPrivateKey(): string;
    loadPrivateKey(privateKey: string | Buffer, passphrase?: string): Promise<void>;
    loadPublicKey(publicKey: string | Buffer): Promise<void>;
    loadIdentity(passphrase: string): Promise<void>;
    loadKeyPair(publicKey: string | Buffer, privateKey: string | Buffer, passphrase?: string): Promise<void>;
    exportPrivateKey(path: string): Promise<void>;
    exportPublicKey(path: string): Promise<void>;
    generateKeySync(name: string, passphrase: string): Buffer;
    generateKey(name: string, passphrase: string): Promise<Buffer>;
    importKeySync(name: string, key: string | Buffer): void;
    importKey(name: string, key: string | Buffer): Promise<void>;
    exportKey(name: string, path: string, createPath?: boolean): Promise<void>;
    exportKeySync(path: string, createPath?: boolean): void;
    getIdentityFromPublicKey(pubKey: Buffer): Promise<Object>;
    getIdentityFromPrivateKey(privKey: Buffer, passphrase: string): Promise<Object>;
    signData(data: Buffer | string, withKey?: Buffer, keyPassphrase?: string): Promise<Buffer>;
    verifyData(data: Buffer | string, signature: Buffer, withKey?: Buffer): Promise<string>;
    verifyFile(filePath: string, signaturePath: string, publicKey?: string | Buffer): Promise<string>;
    signFile(path: string, privateKey?: string | Buffer, privateKeyPassphrase?: string): Promise<string>;
    encryptData(data: Buffer, forPubKey: Buffer): Promise<string>;
    decryptData(data: string, withKey?: Buffer): Promise<Buffer>;
    getKey(name: string): Buffer;
    isLoaded(): boolean;
}
export default KeyManager;
export { KeyPair };
