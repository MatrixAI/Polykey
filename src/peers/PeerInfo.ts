import { AddressInfo } from 'net';
import { peerInterface } from '../../proto/js/Peer';
import { protobufToString, stringToProtobuf } from '../utils';

class Address {
  host: string;
  port: number;
  constructor(host: string, port: number) {
    const parsedAddress = Address.parseHelper(`${host}:${port}`);
    this.host = parsedAddress.host;
    this.port = parsedAddress.port;
  }

  updateHost(host?: string) {
    if (host != undefined && host != '') {
      this.host = host;
    }
  }

  updatePort(port?: number) {
    if (port != undefined && port != 0) {
      this.port = port;
    }
  }

  /**
   * Create an address object from a address string
   * @param addressString Address string in the format of `${this.ip}:${this.port}`
   */
  static parse(addressString: string): Address {
    const { host, port } = Address.parseHelper(addressString);
    return new Address(host, port);
  }

  /**
   * Create an address object from a net.AddressInfo
   * @param addressInfo AddressInfo of desired address
   */
  static fromAddressInfo(addressInfo: AddressInfo) {
    const host = addressInfo.address == '::' ? 'localhost' : addressInfo.address;
    return new Address(host, addressInfo.port);
  }

  /**
   * Convert address into string of format `${this.host}:${this.port}`
   */
  toString() {
    return `${this.host}:${this.port}`;
  }

  /**
   * Parses an address string in the format of `host:port` with the help of regex
   */
  private static AddressRegex = /^([a-zA-Z.]+|(?:[0-9]{1,3}\.){3}[0-9]{1,3})(?::)([0-9]{1,5})$/;
  private static parseHelper(addressString: string): { host: string; port: number } {
    if (!addressString || addressString == '') {
      throw Error(`cannot parse empty or undefined string`);
    }

    if (!Address.AddressRegex.test(addressString)) {
      throw Error(`cannot parse address string: '${addressString}'`);
    }

    // parse using regex
    const components = addressString.match(Address.AddressRegex)?.slice(1, 3)!;
    const host = components[0];
    const port = parseInt(components[1]);

    return { host, port };
  }
}

class PeerInfo {
  publicKey: string;
  // Address where all peer operations occur over (might be obscured by NAT)
  peerAddress?: Address;
  // Public key that the peer connection is relayed over
  relayPublicKey?: string;

  constructor(publicKey: string, connectedAddress?: string, relayPublicKey?: string) {
    this.publicKey = PeerInfo.formatPublicKey(publicKey);
    if (connectedAddress) {
      const addr = Address.parse(connectedAddress);
      this.peerAddress = addr;
    }

    if (relayPublicKey) {
      this.relayPublicKey = PeerInfo.formatPublicKey(relayPublicKey);
    }
  }

  static formatPublicKey(str: string): string {
    const startString = '-----BEGIN PGP PUBLIC KEY BLOCK-----';
    const endString = '-----END PGP PUBLIC KEY BLOCK-----';
    return str.slice(str.indexOf(startString), str.indexOf(endString) + endString.length);
  }

  deepCopy(): PeerInfo {
    return new PeerInfo(this.publicKey, this.peerAddress?.toString(), this.relayPublicKey);
  }

  toStringB64(): string {
    const message = peerInterface.PeerInfoMessage.encodeDelimited({
      publicKey: this.publicKey,
      peerAddress: this.peerAddress?.toString(),
      relayPublicKey: this.relayPublicKey,
    }).finish();
    return protobufToString(message);
  }

  static parseB64(str: string): PeerInfo {
    const message = stringToProtobuf(str);

    const decoded = peerInterface.PeerInfoMessage.decodeDelimited(message);

    return new PeerInfo(decoded.publicKey, decoded.peerAddress, decoded.relayPublicKey);
  }
}

export default PeerInfo;
export { Address };
