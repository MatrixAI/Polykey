import os from 'os'
import fs from 'fs'
import net from 'net'
import tls from 'tls'
import Path from 'path'
import KeyManager from "@polykey/keys/KeyManager";
import PeerInfo, { Address } from "@polykey/peers/PeerInfo";
import { firstPromiseFulfilled } from '@polykey/utils';
import MulticastBroadcaster from "@polykey/peers/MulticastBroadcaster";
import RPCMessage from '@polykey/rpc/RPCMessage';
import createX509Certificate from '@polykey/pki/PublicKeyInfrastructure'

interface SocialDiscovery {
  // Must return a public pgp key
  name: string
  findUser(handle: string, service: string): Promise<string>
}

const keybaseLookup = async (handle: string, service: string): Promise<string> => {
  const url = `https://keybase.io/_/api/1.0/user/lookup.json?${service}=${handle}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    const pubKey = data.them[0].public_keys.primary.bundle
    return pubKey
  } catch (err) {
    throw new Error(`User was not found: ${err.message}`)
  }
}
const keybaseDiscovery: SocialDiscovery = {
  name: 'Keybase',
  findUser: keybaseLookup
}

type PeerManagerMetadata = {
  localPeerInfo: PeerInfo | null
}

class PeerManager {
  private metadataPath: string
  private metadata: PeerManagerMetadata = { localPeerInfo: null }

  private localPeerInfo: PeerInfo
  private peerStore: Map<string, PeerInfo>
  private keyManager: KeyManager
  multicastBroadcaster: MulticastBroadcaster
  private socialDiscoveryServices: SocialDiscovery[]

  // Peer connections
  server: tls.Server
  baseOptions: {
    key: string,
    cert: string,
    requestCert: boolean,
    rejectUnauthorized: boolean
  }
  peerConnections: Map<string, tls.TLSSocket>

  constructor(
    polykeyPath: string = `${os.homedir()}/.polykey`,
    keyManager: KeyManager,
    peerInfo?: PeerInfo,
    socialDiscoveryServices: SocialDiscovery[] = []
  ) {
    fs.mkdirSync(polykeyPath, {recursive: true})
    this.metadataPath = Path.join(polykeyPath, '.peerMetadata')

    // Set given variables
    this.keyManager = keyManager
    this.socialDiscoveryServices = socialDiscoveryServices

    // Load metadata with peer info
    this.loadMetadata()

    // Load peer store and local peer info
    if (peerInfo) {
      this.localPeerInfo = peerInfo
      this.writeMetadata()
    } else if (this.metadata.localPeerInfo) {
      this.localPeerInfo = this.metadata.localPeerInfo
    } else if (this.keyManager.hasPublicKey()) {
      this.localPeerInfo = new PeerInfo(this.keyManager.getPublicKey())
    }
    this.peerStore = new Map()

    this.socialDiscoveryServices = []
    this.socialDiscoveryServices.push(keybaseDiscovery)
    for (const service of socialDiscoveryServices) {
      this.socialDiscoveryServices.push(service)
    }

    this.multicastBroadcaster = new MulticastBroadcaster(this.addPeer, this.localPeerInfo, this.keyManager)

    // Setup secure server
    const {keyPem, certPem} = createX509Certificate()
    this.baseOptions = {
      key: keyPem,
      cert: certPem,
      requestCert: true,
      rejectUnauthorized: false,
    }
    const options: tls.TlsOptions = {
      ...this.baseOptions,
    }
    this.server = tls.createServer(options)
    this.server.listen()
    const addressInfo = <net.AddressInfo>this.server.address()
    const address = Address.fromAddressInfo(addressInfo)

    // This part is for adding the address of the custom tcp server to the localPeerInfo
    // Currently this is replaced by the connection within the git server (NodeJS.http module)
    this.localPeerInfo.connect(address)
  }

  ////////////////
  // Peer store //
  ////////////////
  getLocalPeerInfo(): PeerInfo {
    return this.localPeerInfo
  }

  connectLocalPeerInfo(address: Address) {
    this.localPeerInfo.connect(address)
  }

  addPeer(peerInfo: PeerInfo): void {
    this.peerStore.set(peerInfo.publicKey, peerInfo)
  }

  getPeer(pubKey: string): PeerInfo | null {
    return this.peerStore.get(pubKey) ?? null
  }

  hasPeer(pubKey: string): boolean {
    return this.peerStore.has(pubKey)
  }

  //////////////////////
  // Social discovery //
  //////////////////////
  async findPubKey(pubKey: string): Promise<PeerInfo> {
    return new Promise<PeerInfo>((resolve, reject) => {
      this.multicastBroadcaster.requestPeerContact(pubKey)
      this.multicastBroadcaster.on('found', (peerInfo: PeerInfo) => {
        if (peerInfo.publicKey == pubKey) {
          resolve(peerInfo)
        }
      })

      this.multicastBroadcaster.on('timeout', (timedOutPubKey: string) => {
        if (timedOutPubKey == pubKey) {
          reject('The broadcaster stopped looking')
        }
      })
    })
  }

  async findSocialUser(handle: string, service: string): Promise<PeerInfo> {
    const tasks: Promise<string>[] = []
    for (const socialDiscovery of this.socialDiscoveryServices) {

      try {
        tasks.push(socialDiscovery.findUser(handle, service))
      } catch (error) {
        console.log(`Could not find user on this discovery service: ${socialDiscovery.name}`);
      }
    }

    const pubKeyOrFail = await firstPromiseFulfilled(tasks)
    if (pubKeyOrFail.length > 1) {
      throw new Error('Could not find public key from services')
    }

    const pubKeyFound = pubKeyOrFail[0]
    const peerInfo = await this.findPubKey(pubKeyFound)
    return peerInfo
  }
  ///////////////////////
  // Peers Connections //
  ///////////////////////
  connectToPeer(peer: string | Address): tls.TLSSocket {
    let address: Address
    if (typeof peer == 'string') {
      const existingSocket = this.peerConnections.get(peer)
      if (existingSocket) {
        return existingSocket
      }
      const peerAddress = this.getPeer(peer)?.connectedAddr
      if (peerAddress) {
        address = peerAddress
      } else {
        throw new Error('Peer does not exist in peer store')
      }
    } else {
      address = peer
    }

    const options: tls.ConnectionOptions = {
      ...this.baseOptions,
      port: parseInt(address.port),
      host: address.ip,
    }

    const socket = tls.connect(options)

    if (typeof peer == 'string') {
      this.peerConnections.set(peer, socket)
    }
    return socket
  }

  /* ============ HELPERS =============== */
  private writeMetadata(): void {
    const metadata = JSON.stringify(RPCMessage.encodePeerInfo(this.localPeerInfo))
    fs.writeFileSync(this.metadataPath, metadata)
  }
  private loadMetadata(): void {
    // Check if file exists
    if (fs.existsSync(this.metadataPath)) {
      const metadata = fs.readFileSync(this.metadataPath).toString()
      this.localPeerInfo = RPCMessage.decodePeerInfo(Buffer.from(metadata))
    }
  }
}

export default PeerManager
export { SocialDiscovery }
