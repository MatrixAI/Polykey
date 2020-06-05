import { Address } from '../peers/PeerInfo';
import VaultManager from '../vaults/VaultManager';
declare class GitServer {
    private polykeyPath;
    private vaultManager;
    private server;
    address: Address;
    constructor(polykeyPath: string, vaultManager: VaultManager, port?: number);
    /**
     * Find out whether vault exists.
     * @param vaultName Name of vault to check
     * @param publicKey Public key of peer trying to access vault
     */
    private exists;
    /**
     * Handle incoming info or pack requests and delegates to respective functions
     * @param req Incoming http message
     * @param res Outgoing server response
     */
    private handle;
    /**
     * Returns a not found response
     * @param res Outgoing server response
     */
    private notFoundResponse;
    /**
     * Handles a request for remote info
     * @param req Incoming http message
     * @param res Outgoing server response
     */
    private handleInfoRequest;
    /**
     * Handles a requests for packfiles
     * @param req Incoming http message
     * @param res Outgoing server response
     */
    private handlePackRequest;
    /**
     * Sends http response containing git info about the particular vault
     * @param vaultName Name of the requested vault
     * @param service The type of service requested, either upload-pack or recieve-pack
     * @param res Outgoing server response
     */
    private infoResponse;
    /**
     * Adds headers to the response object to add cache control
     * @param res Outgoing server response
     */
    private noCache;
    /**
     * Encodes a string into a git packet line by prefixing the hexadecimal length of the line
     * @param line The line to be encoded
     */
    private createGitPacketLine;
    /**
     * Handles the response to a git packfile request
     * @param vaultName Name of the requested vault
     * @param vaultPath Path to the target vault
     * @param service The type of service requested, either upload-pack or recieve-pack
     * @param res Outgoing server response
     */
    private uploadPackRespond;
}
export default GitServer;
