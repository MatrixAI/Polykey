import { AddressInfo } from "net"

class Address {
  ip: string
  port: string
  constructor(
    ip: string,
    port: string
  ) {
    this.ip = ip
    this.port = port
  }

  static parse(addr: string): Address {
    const components = addr.split(':')
    const ip = components[0]
    const port = components[1]

    return new Address(ip, port)
  }

  toString() {
    return `${this.ip}:${this.port}`
  }

  static fromAddressInfo(addressInfo: AddressInfo) {
    const ip = (addressInfo.address == '::') ? '127.0.0.1' : addressInfo.address
    return new Address(ip, addressInfo.port.toString())
  }

}

Address.prototype.toString = function() {
  return `${this.ip}:${this.port}`
}

class PeerInfo {
  publicKey: string
  addresses: Set<Address>
  connectedAddr?: Address
  constructor(
    pubKey: string,
    addresses: string[] = [],
    connectedAddr?: string
  ) {
    this.publicKey = pubKey
    this.addresses = new Set(addresses.map((addr) => {
      return Address.parse(addr)
    }))
    this.connectedAddr = (connectedAddr) ? Address.parse(connectedAddr) : undefined
  }

  connect(address: Address) {
    if (!this.addresses.has(address)) {
      this.addresses.add(address)
    }

    this.connectedAddr = address
  }

  disconnect() {
    this.connectedAddr = undefined
  }

}

export default PeerInfo
export { Address }
