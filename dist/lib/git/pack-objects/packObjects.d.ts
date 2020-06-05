import { EncryptedFS } from 'encryptedfs';
import { PassThrough } from 'readable-stream';
declare type Ack = {
    oid: string;
};
/**
 * Create a packfile stream
 *
 * @link https://isomorphic-git.github.io/docs/packObjects.html
 */
declare function packObjects(fileSystem: EncryptedFS, dir: string, refs: string[], depth?: number, haves?: string[]): Promise<{
    packstream: PassThrough;
    shallows: Set<string>;
    unshallows: Set<unknown>;
    acks: Ack[];
}>;
declare function listObjects(fileSystem: EncryptedFS, dir: string, gitdir: string | undefined, oids: string[]): Promise<string[]>;
declare function pack(fileSystem: EncryptedFS, dir: string, gitdir: string | undefined, oids: string[], outputStream: PassThrough): Promise<PassThrough>;
export default packObjects;
export { listObjects, pack };
