import { Address } from '../peers/PeerInfo';
import KeyManager from '../keys/KeyManager';
/**
 * Responsible for converting HTTP messages from isomorphic-git into requests and sending them to a specific peer.
 */
declare class GitClient {
    private client;
    private credentials;
    constructor(address: Address, keyManager: KeyManager);
    /**
     * The custom http request method to feed into isomorphic-git's [custom http object](https://isomorphic-git.org/docs/en/http)
     */
    request({ url, method, headers, body, onProgress }: {
        url: any;
        method: any;
        headers: any;
        body: any;
        onProgress: any;
    }): Promise<any>;
    /**
     * Requests remote info from the connected peer for the named vault.
     * @param vaultName Name of the desired vault
     */
    private requestInfo;
    /**
     * Requests a pack from the connected peer for the named vault.
     * @param vaultName Name of the desired vault
     */
    private requestPack;
    /**
     * Converts a buffer into an iterator expected by isomorphic git.
     * @param data Data to be turned into an iterator
     */
    private iteratorFromData;
}
export default GitClient;
