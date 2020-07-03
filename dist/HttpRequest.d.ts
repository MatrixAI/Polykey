/// <reference types="node" />
import net from 'net';
import { Address } from './peers/PeerInfo';
declare class HttpRequest {
    address: Address;
    getSocket: (address: Address) => net.Socket;
    constructor(address: Address, getSocket: (address: Address) => net.Socket);
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
     * Converts http incoming message into a iterator that can be used by [isomorphic-git](https://isomorphic-git.org)
     * @param message Http IncomingMessage
     */
    private httpMessageToIter;
}
export default HttpRequest;
