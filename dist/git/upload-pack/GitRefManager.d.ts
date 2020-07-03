import { EncryptedFS } from 'encryptedfs';
declare class GitRefManager {
    static packedRefs(fileSystem: EncryptedFS, gitdir: string): Promise<Map<string, string>>;
    static listRefs(fileSystem: EncryptedFS, gitdir: string, filepath: string): Promise<string[]>;
    static resolve(fileSystem: EncryptedFS, gitdir: string, ref: string, depth?: number): any;
}
export default GitRefManager;
