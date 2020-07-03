"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Address {
    constructor(ip, port) {
        this.ip = ip;
        this.port = port;
    }
    /**
     * Create an address object from a address string
     * @param addressString Address string in the format of `${this.ip}:${this.port}`
     */
    static parse(addressString) {
        const components = addressString.split(':');
        const ip = components[0];
        const port = components[1];
        return new Address(ip, port);
    }
    /**
     * Create an address object from a net.AddressInfo
     * @param addressInfo AddressInfo of desired address
     */
    static fromAddressInfo(addressInfo) {
        const ip = (addressInfo.address == '::') ? 'localhost' : addressInfo.address;
        return new Address(ip, addressInfo.port.toString());
    }
    /**
     * Convert address into string of format `${this.ip}:${this.port}`
     */
    toString() {
        return `${this.ip}:${this.port}`;
    }
}
exports.Address = Address;
Address.prototype.toString = function () {
    return `${this.ip}:${this.port}`;
};
class PeerInfo {
    constructor(pubKey, addresses = [], connectedAddr) {
        this.publicKey = pubKey;
        this.addresses = new Set(addresses.map((addr) => {
            return Address.parse(addr);
        }));
        this.connectedAddr = (connectedAddr) ? Address.parse(connectedAddr) : undefined;
    }
    /**
     * Sets the main server address for the peer
     * @param address Main server address for peer
     */
    connect(address) {
        if (!this.addresses.has(address)) {
            this.addresses.add(address);
        }
        this.connectedAddr = address;
    }
    /**
     * Clears the main server address for the peer
     */
    disconnect() {
        this.connectedAddr = undefined;
    }
}
exports.default = PeerInfo;
//# sourceMappingURL=PeerInfo.js.map