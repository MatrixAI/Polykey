/// <reference types="node" />
declare const keyManagerWorker: {
    /**
     * Signs the given data with the provided identity
     * @param data Buffer or file containing the data to be signed
     * @param identity Identity with which to sign with.
     */
    signData(data: string | Buffer, identity: any): Promise<Buffer>;
    /**
     * Verifies the given data with the provided identity
     * @param data Buffer or file containing the data to be verified
     * @param signature The PGP signature
     * @param identity Identity with which to verify with.
     */
    verifyData(data: string | Buffer, signature: Buffer, identity: any): Promise<boolean>;
    /**
     * Encrypts the given data for the provided identity
     * @param data The data to be encrypted
     * @param identity Identity to encrypt for
     */
    encryptData(data: Buffer, identity: any): Promise<string>;
    /**
     * Decrypts the given data with the provided identity
     * @param data The data to be decrypted
     * @param identity Identity to decrypt with
     */
    decryptData(data: Buffer, identity: any): Promise<Buffer>;
};
export declare type KeyManagerWorker = typeof keyManagerWorker;
export {};
