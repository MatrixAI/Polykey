/// <reference types="node" />
declare const keyManagerWorker: {
    signData(data: string | Buffer, identity: any): Promise<Buffer>;
    verifyData(data: string | Buffer, signature: Buffer, identity: any): Promise<string>;
    encryptData(data: Buffer, identity: any): Promise<string>;
    decryptData(data: string, identity: any): Promise<Buffer>;
};
export declare type KeyManagerWorker = typeof keyManagerWorker;
export {};
