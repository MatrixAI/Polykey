import { EncryptedFS } from 'encryptedfs';
declare class GitObjectManager {
    static read(fileSystem: EncryptedFS, gitdir: string, oid: string, format?: string): Promise<any>;
}
export default GitObjectManager;
