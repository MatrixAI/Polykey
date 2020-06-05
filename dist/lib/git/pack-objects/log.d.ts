import { EncryptedFS } from 'encryptedfs';
declare function logCommit(fileSystem: EncryptedFS, gitdir: string, oid: string, signing: boolean): Promise<any>;
/**
 * Get commit descriptions from the git history
 *
 * @link https://isomorphic-git.github.io/docs/log.html
 */
declare function log(fileSystem: EncryptedFS, dir: any, gitdir: string | undefined, ref: string | undefined, depth: any, since: any, // Date
signing?: boolean): Promise<any[]>;
export default log;
export { logCommit };
