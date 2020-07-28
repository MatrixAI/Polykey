import { AddressInfo } from 'net';

class Address {
  ip: string;
  port: string;
  constructor(ip: string, port: string) {
    this.ip = ip;
    this.port = port;
  }

  /**
   * Create an address object from a address string
   * @param addressString Address string in the format of `${this.ip}:${this.port}`
   */
  static parse(addressString: string): Address {
    const components = addressString.split(':');
    const ip = components[0];
    const port = components[1];

    return new Address(ip, port);
  }

  /**
   * Create an address object from a net.AddressInfo
   * @param addressInfo AddressInfo of desired address
   */
  static fromAddressInfo(addressInfo: AddressInfo) {
    const ip = addressInfo.address == '::' ? 'localhost' : addressInfo.address;
    return new Address(ip, addressInfo.port.toString());
  }

  /**
   * Convert address into string of format `${this.ip}:${this.port}`
   */
  toString() {
    return `${this.ip}:${this.port}`;
  }
}

Address.prototype.toString = function () {
  return `${this.ip}:${this.port}`;
};

class PeerInfo {
  publicKey: string;
  addresses: Set<Address>;
  connectedAddr?: Address;
  constructor(pubKey: string, addresses: string[] = [], connectedAddr?: string) {
    this.publicKey = pubKey;
    this.addresses = new Set(
      addresses.map((addr) => {
        return Address.parse(addr);
      }),
    );
    this.connectedAddr = connectedAddr ? Address.parse(connectedAddr) : undefined;
  }

  /**
   * Sets the main server address for the peer
   * @param address Main server address for peer
   */
  connect(address: Address) {
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

  public get AdressStringList(): string[] {
    return Array.from(this.addresses.values()).map((addr) => {
      return addr.toString();
    });
  }
}

export default PeerInfo;
export { Address };
