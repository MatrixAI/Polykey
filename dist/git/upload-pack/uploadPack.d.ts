/// <reference types="node" />
import { EncryptedFS } from 'encryptedfs';
declare function uploadPack(fileSystem: EncryptedFS, dir: string, gitdir?: string, advertiseRefs?: boolean): Promise<Buffer[] | undefined>;
export default uploadPack;
