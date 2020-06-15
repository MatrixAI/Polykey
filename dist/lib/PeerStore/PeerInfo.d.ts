declare class Address {
    ip: string;
    port: string;
    constructor(ip: string, port: string);
    static parse(addr: string): Address;
}
declare class PeerInfo {
    publicKey: string;
    addresses: Set<Address>;
    connectedAddr?: Address;
    constructor(pubKey: string, addresses?: string[], connectedAddr?: string);
    connect(address: Address): void;
    disconnect(): void;
}
export default PeerInfo;
export { Address };
