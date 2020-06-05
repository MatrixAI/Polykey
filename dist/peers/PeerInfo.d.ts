/// <reference types="node" />
import { AddressInfo } from 'net';
declare class Address {
    ip: string;
    port: string;
    constructor(ip: string, port: string);
    /**
     * Create an address object from a address string
     * @param addressString Address string in the format of `${this.ip}:${this.port}`
     */
    static parse(addressString: string): Address;
    /**
     * Create an address object from a net.AddressInfo
     * @param addressInfo AddressInfo of desired address
     */
    static fromAddressInfo(addressInfo: AddressInfo): Address;
    /**
     * Convert address into string of format `${this.ip}:${this.port}`
     */
    toString(): string;
}
declare class PeerInfo {
    publicKey: string;
    addresses: Set<Address>;
    connectedAddr?: Address;
    constructor(pubKey: string, addresses?: string[], connectedAddr?: string);
    /**
     * Sets the main server address for the peer
     * @param address Main server address for peer
     */
    connect(address: Address): void;
    /**
     * Clears the main server address for the peer
     */
    disconnect(): void;
}
export default PeerInfo;
export { Address };
