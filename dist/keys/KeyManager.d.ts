/// <reference types="node" />
import fs from 'fs';
import { Pool, ModuleThread } from 'threads';
import { KeyManagerWorker } from '../keys/KeyManagerWorker';
declare type KeyPair = {
    private: string | null;
    public: string | null;
};
declare type PKInfo = {
    key: Buffer | null;
    cert: Buffer | null;
    caCert: Buffer | null;
};
declare class KeyManager {
    private primaryKeyPair;
    private primaryIdentity?;
    private derivedKeys;
    private useWebWorkers;
    private workerPool?;
    polykeyPath: string;
    private fileSystem;
    private metadataPath;
    private metadata;
    pkiInfo: PKInfo;
    constructor(polyKeyPath: string | undefined, fileSystem: typeof fs, passphrase?: string, useWebWorkers?: boolean, workerPool?: Pool<ModuleThread<KeyManagerWorker>>);
    /**
     * Generates a new assymetric key pair (publicKey and privateKey).
     * @param name Name of keypair owner
     * @param email Email of keypair owner
     * @param passphrase Passphrase to lock the keypair
     * @param nbits Size of the new keypair
     * @param replacePrimary If true, the generated keypair becomes the new primary identity of the key manager
     * @param progressCallback A progress hook for keypair generation
     */
    generateKeyPair(name: string, email: string, passphrase: string, nbits?: number, replacePrimary?: boolean, progressCallback?: (info: any) => void): Promise<KeyPair>;
    /**
     * Get the primary keypair
     */
    getKeyPair(): KeyPair;
    /**
     * Determines whether public key is loaded or not
     */
    hasPublicKey(): boolean;
    /**
     * Get the public key of the primary keypair
     */
    getPublicKey(): string;
    /**
     * Get the private key of the primary keypair
     */
    getPrivateKey(): string;
    /**
     * Loads the keypair into the key manager as the primary identity
     * @param publicKey Public Key
     * @param privateKey Private Key
     * @param passphrase Passphrase to unlock the private key
     */
    loadKeyPair(publicKey: string | Buffer, privateKey: string | Buffer, passphrase: string): Promise<void>;
    /**
     * Loads the private key into the primary keypair
     * @param privateKey Private Key
     */
    loadPrivateKey(privateKey: string | Buffer): Promise<void>;
    /**
     * Loads the public key into the primary keypair
     * @param publicKey Public Key
     */
    loadPublicKey(publicKey: string | Buffer): Promise<void>;
    /**
     * Loads the primary identity into the key manager from the existing keypair
     * @param passphrase Passphrase to unlock the private key
     */
    loadIdentity(passphrase: string): Promise<void>;
    /**
     * Export the primary private key to a specified location
     * @param path Destination path
     */
    exportPrivateKey(path: string): Promise<void>;
    /**
     * Export the primary public key to a specified location
     * @param path Destination path
     */
    exportPublicKey(path: string): Promise<void>;
    /**
     * Synchronously generates a new symmetric key and stores it in the key manager
     * @param name Unique name of the generated key
     * @param passphrase Passphrase to derive the key from
     */
    generateKeySync(name: string, passphrase: string): Buffer;
    /**
     * Asynchronously Generates a new symmetric key and stores it in the key manager
     * @param name Unique name of the generated key
     * @param passphrase Passphrase to derive the key from
     */
    generateKey(name: string, passphrase: string): Promise<Buffer>;
    /**
     * Synchronously imports an existing key from file or Buffer
     * @param name Unique name of the imported key
     * @param key Key to be imported
     */
    importKeySync(name: string, key: string | Buffer): void;
    /**
     * Asynchronously imports an existing key from file or Buffer
     * @param name Unique name of the imported key
     * @param key Key to be imported
     */
    importKey(name: string, key: string | Buffer): Promise<void>;
    /**
     * Synchronously exports an existing key from file or Buffer
     * @param name Name of the key to be exported
     * @param path Destination path
     * @param createPath If set to true, the path is recursively created
     */
    exportKeySync(name: string, path: string, createPath?: boolean): void;
    /**
     * Asynchronously exports an existing key from file or Buffer
     * @param name Name of the key to be exported
     * @param path Destination path
     * @param createPath If set to true, the path is recursively created
     */
    exportKey(name: string, path: string, createPath?: boolean): Promise<void>;
    /**
     * Loads an identity from the given public key
     * @param publicKey Buffer containing the public key
     */
    getIdentityFromPublicKey(publicKey: Buffer): Promise<Object>;
    /**
     * Loads an identity from the given private key
     * @param publicKey Buffer containing the public key
     */
    getIdentityFromPrivateKey(privateKey: Buffer, passphrase: string): Promise<Object>;
    /**
     * Signs the given data with the provided key or the primary key if none is specified
     * @param data Buffer or file containing the data to be signed
     * @param privateKey Buffer containing the key to sign with. Defaults to primary private key if no key is given.
     * @param keyPassphrase Required if privateKey is provided.
     */
    signData(data: Buffer | string, privateKey?: Buffer, keyPassphrase?: string): Promise<Buffer>;
    /**
     * Signs the given file with the provided key or the primary key if none is specified
     * @param filePath Path to file containing the data to be signed
     * @param privateKey The key to sign with. Defaults to primary public key if no key is given.
     * @param keyPassphrase Required if privateKey is provided.
     */
    signFile(filePath: string, privateKey?: string | Buffer, keyPassphrase?: string): Promise<string>;
    /**
     * Verifies the given data with the provided key or the primary key if none is specified
     * @param data Buffer or file containing the data to be verified
     * @param signature The PGP signature
     * @param publicKey Buffer containing the key to verify with. Defaults to primary public key if no key is given.
     */
    verifyData(data: Buffer | string, signature: Buffer, publicKey?: Buffer): Promise<boolean>;
    /**
     * Verifies the given file with the provided key or the primary key if none is specified
     * @param filePath Path to file containing the data to be verified
     * @param signaturePath The path to the file containing the PGP signature
     * @param publicKey Buffer containing the key to verify with. Defaults to primary public key if no key is given.
     */
    verifyFile(filePath: string, signaturePath: string, publicKey?: string | Buffer): Promise<boolean>;
    /**
     * Encrypts the given data for a specific public key
     * @param data The data to be encrypted
     * @param publicKey The key to encrypt for
     */
    encryptData(data: Buffer, publicKey?: Buffer): Promise<string>;
    /**
     * Decrypts the given data with the provided key or the primary key if none is given
     * @param data The data to be decrypted
     * @param privateKey The key to decrypt with. Defaults to primary private key if no key is given.
     * @param keyPassphrase Required if privateKey is provided.
     */
    decryptData(data: Buffer, privateKey?: Buffer, keyPassphrase?: string): Promise<Buffer>;
    get PKIInfo(): PKInfo;
    loadPKIInfo(key?: Buffer | null, cert?: Buffer | null, caCert?: Buffer | null, writeToFile?: boolean): void;
    /**
     * Get the key for a given name
     * @param name The unique name of the desired key
     */
    getKey(name: string): Buffer;
    /**
     * Determines if the Key Manager has a certain key
     * @param name The unique name of the desired key
     */
    hasKey(name: string): boolean;
    private writeMetadata;
    private loadMetadata;
}
export default KeyManager;
export { KeyPair };
