import os from 'os'
import fs from 'fs'
import grpc from 'grpc'
import Path from 'path'
import KeyManager from "@polykey/keys/KeyManager";
import PeerInfo, { Address } from "@polykey/peers/PeerInfo";
import { firstPromiseFulfilled } from '@polykey/utils';
import MulticastBroadcaster from "@polykey/peers/MulticastBroadcaster";
import RPCMessage from '@polykey/rpc/RPCMessage';
import createX509Certificate from '@polykey/pki/PublicKeyInfrastructure'
import GitClient from '@polykey/git/GitClient';
import GitBackend from '@polykey/git/GitBackend';
import PublicKeyInfrastructure from '@polykey/pki/PublicKeyInfrastructure';

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
  server: grpc.Server
  credentials: grpc.ServerCredentials
  private peerConnections: Map<string, GitClient>
  handleInfoRequest: (vaultName: string) => Promise<Buffer>
  handlePackRequest: (vaultName: string, body: Buffer) => Promise<Buffer>

  constructor(
    polykeyPath: string = `${os.homedir()}/.polykey`,
    keyManager: KeyManager,
    gitBackend: GitBackend,
    pki: PublicKeyInfrastructure,
    peerInfo?: PeerInfo,
    socialDiscoveryServices: SocialDiscovery[] = [],
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

    /////////////////
    // GRPC Server //
    /////////////////

    this.server = new grpc.Server();


    const protoLoader = require('@grpc/proto-loader')
    const PROTO_PATH = __dirname + '/../../proto/git_server.proto';

    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });

    const git_server_proto = grpc.loadPackageDefinition(packageDefinition);

    // Add service
    async function requestInfo(call, callback) {
      const vaultName = call.request.vaultName
      const body = await gitBackend.handleInfoRequest(vaultName)
      callback(null, { vaultName: vaultName, body: body });
    }

    async function requestPack(call, callback) {
      const vaultName = call.request.vaultName
      const body = call.request.body.toString()
      callback(null, { vaultName: vaultName, body: await gitBackend.handlePackRequest(vaultName, body) });
    }
    this.server.addService((git_server_proto.GitServer as any).service, {
      requestInfo: requestInfo,
      requestPack: requestPack
    });

    // Bind server and set address
    this.credentials = grpc.ServerCredentials.createSsl(
      pki.caPrivateKey!,
      [{
        private_key: pki.key,
        cert_chain: pki.cert
      }],
      false,
    )
    const port = this.server.bind('0.0.0.0:0', this.credentials);
    const address = new Address('127.0.0.1', port.toString())
    this.server.start();
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
  connectToPeer(peer: string | Address): GitClient {
    // Throw error if trying to connect to self
    if (peer == this.localPeerInfo.connectedAddr || peer == this.localPeerInfo.publicKey) {
      throw new Error('Cannot connect to self')
    }
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

    const conn = new GitClient(address)

    if (typeof peer == 'string') {
      this.peerConnections.set(peer, conn)
    }

    return conn
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
