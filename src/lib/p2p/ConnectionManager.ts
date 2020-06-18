import tls from 'tls'
import net from 'net'
import http from 'http'
import { AddressInfo } from 'net'
import { Address } from '@polykey/peer-store/PeerInfo'
import PeerStore from '@polykey/peer-store/PeerStore'
import createX509Certificate from '@polykey/pki/PublicKeyInfrastructure'

class ConnectionManager {
  peerStore: PeerStore

  server: tls.Server
  connections: Map<string, tls.TLSSocket>

  keyPem: string
  certPem: string
  address: Address
  constructor(peerStore: PeerStore) {
    this.peerStore = peerStore

    const {keyPem, certPem} = createX509Certificate()
    this.keyPem = keyPem
    this.certPem = certPem
    const options: tls.TlsOptions = {
      key: keyPem,
      cert: certPem,
      requestCert: true,
      rejectUnauthorized: false
    }
    this.server = tls.createServer(options)

    // const addressInfo = <AddressInfo>this.server.address()
    // const address = new Address(addressInfo.address, addressInfo.port.toString())
    // this.peerStore.localPeerInfo.connect(address)

    this.connections = new Map()
  }

  connect(peer: string | Address) {
    if (typeof peer == 'string') {
      const existingSocket = this.connections.get(peer)
      if (existingSocket) {
        return existingSocket
      } else {
        const address = this.peerStore.get(peer)?.connectedAddr
        if (address) {
          const options: tls.ConnectionOptions = {
            port: parseInt(address.port),
            host: address.ip,
            key: this.keyPem,
            cert: this.certPem
          }
          const socket =  tls.connect(options)
          this.connections.set(peer, socket)
          return socket
        }
      }
    } else {
      const address = peer
      const options: tls.ConnectionOptions = {
        port: parseInt(address.port),
        host: address.ip,
        key: this.keyPem,
        cert: this.certPem
      }
      return tls.connect(options)
    }


    throw new Error('Peer does not have an address connected')
  }
}

export default ConnectionManager
