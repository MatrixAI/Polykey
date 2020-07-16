import os from 'os';
import fs from 'fs';
import path from 'path';
import * as grpc from '@grpc/grpc-js'
import GitClient from '../git/GitClient';
import GitBackend from '../git/GitBackend';
import KeyManager from '../keys/KeyManager';
import { peer } from '../../../proto/js/Peer';
import { firstPromiseFulfilled } from '../utils';
import VaultManager from '../vaults/VaultManager';
import PeerInfo, { Address } from '../peers/PeerInfo';
import MulticastBroadcaster from '../peers/MulticastBroadcaster';
import { GitServerService } from '../../../proto/compiled/Git_grpc_pb';
import { InfoRequest, PackRequest, PackReply, InfoReply } from '../../../proto/compiled/Git_pb';

interface SocialDiscovery {
  // Must return a public pgp key
  name: string
  findUser(handle: string, service: string): Promise<string>
}

const keybaseDiscovery: SocialDiscovery = {
  name: 'Keybase',
  findUser: async (handle: string, service: string): Promise<string> => {
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
}

type PeerManagerMetadata = {
  localPeerInfo: PeerInfo | null
}

class PeerManager {
  private fileSystem: typeof fs

  private metadataPath: string
  private metadata: PeerManagerMetadata = { localPeerInfo: null }

  private localPeerInfo: PeerInfo
  private peerStore: Map<string, PeerInfo>
  private keyManager: KeyManager
  multicastBroadcaster: MulticastBroadcaster
  private socialDiscoveryServices: SocialDiscovery[]

  // Peer connections
  server: grpc.Server
  serverStarted: boolean = false
  private gitBackend: GitBackend
  private credentials: grpc.ServerCredentials
  private peerConnections: Map<string, GitClient>

  constructor(
    polykeyPath: string = `${os.homedir()}/.polykey`,
    fileSystem: typeof fs,
    keyManager: KeyManager,
    vaultManager: VaultManager,
    peerInfo?: PeerInfo,
    socialDiscoveryServices: SocialDiscovery[] = []
  ) {
    this.fileSystem = fileSystem

    this.fileSystem.mkdirSync(polykeyPath, { recursive: true })
    this.metadataPath = path.join(polykeyPath, '.peerMetadata')

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

    this.peerConnections = new Map()
    /////////////////
    // GRPC Server //
    /////////////////
    this.gitBackend = new GitBackend(polykeyPath, vaultManager)
    this.server = new grpc.Server();

    // Add service
    this.server.addService(GitServerService, {
      requestInfo: this.requestInfo.bind(this),
      requestPack: this.requestPack.bind(this)
    });

    // Create the server credentials. SSL only if ca cert exists
    const pkiInfo = this.keyManager.PKIInfo

    // if (pkiInfo.caCert && pkiInfo.cert && pkiInfo.key) {
    //   this.credentials = grpc.ServerCredentials.createSsl(
    //     pkiInfo.caCert,
    //     [{
    //       private_key: pkiInfo.key,
    //       cert_chain: pkiInfo.cert,
    //     }],
    //     true
    //   )
    // } else {
      this.credentials = grpc.ServerCredentials.createInsecure()
    // }

    this.server.bindAsync(`0.0.0.0:${process.env.PK_PORT ?? 0}`, this.credentials, (err, boundPort) => {
      if (err) {
        throw err
      } else {
        const address = new Address('localhost', boundPort.toString())
        this.server.start();
        this.localPeerInfo.connect(address)
        this.serverStarted = true
      }
    });
  }

  private async requestInfo(call, callback) {
    const infoRequest: InfoRequest = call.request

    const vaultName = infoRequest.getVaultname()

    const infoReply = new InfoReply()
    infoReply.setVaultname(vaultName)
    infoReply.setBody(await this.gitBackend.handleInfoRequest(vaultName))
    callback(null, infoReply);
  }

   private async requestPack(call, callback) {
    const packRequest: PackRequest = call.request
    const vaultName = packRequest.getVaultname()
    const body = Buffer.from(packRequest.getBody_asB64(), 'base64')

    const reply = new PackReply()
    reply.setVaultname(vaultName)
    reply.setBody(await this.gitBackend.handlePackRequest(vaultName, body))
    callback(null, reply);
  }

  ////////////////
  // Peer store //
  ////////////////
  /**
   * Get the peer info of the current keynode
   */
  getLocalPeerInfo(): PeerInfo {
    return this.localPeerInfo
  }

  /**
   * Set the address of the active server
   * @param adress Address of active server
   */
  connectLocalPeerInfo(address: Address) {
    this.localPeerInfo.connect(address)
  }

  /**
   * Add a peer's info to the peerStore
   * @param peerInfo Info of the peer to be added
   */
  addPeer(peerInfo: PeerInfo): void {
    this.peerStore.set(peerInfo.publicKey, peerInfo)

  }

  /**
   * Retrieves a peer for the given public key
   * @param publicKey Public key of the desired peer
   */
  getPeer(publicKey: string): PeerInfo | null {
    return this.peerStore.get(publicKey) ?? null
  }

  /**
   * Determines if the peerStore contains the desired peer
   * @param publicKey Public key of the desired peer
   */
  hasPeer(pubKey: string): boolean {
    return this.peerStore.has(pubKey)
  }

  //////////////////////
  // Social discovery //
  //////////////////////
  /**
   * Finds an existing peer using multicast peer discovery
   * @param publicKey Public key of the desired peer
   */
  async findPubKey(publicKey: string): Promise<PeerInfo> {
    return new Promise<PeerInfo>((resolve, reject) => {
      this.multicastBroadcaster.requestPeerContact(publicKey)
      this.multicastBroadcaster.on('found', (peerInfo: PeerInfo) => {
        if (peerInfo.publicKey == publicKey) {
          resolve(peerInfo)
        }
      })

      this.multicastBroadcaster.on('timeout', (timedOutPubKey: string) => {
        if (timedOutPubKey == publicKey) {
          reject('The broadcaster stopped looking')
        }
      })
    })
  }

  /**
   * Finds an existing peer given a social service and handle
   * @param handle Username or handle of the user (e.g. @john-smith)
   * @param service Service on which to search for the user (e.g. github)
   */
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
  /**
   * Get a secure connection to the peer
   * @param peer Public key of an existing peer or address of new peer
   */
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

    const conn = new GitClient(address, this.keyManager)

    if (typeof peer == 'string') {
      this.peerConnections.set(peer, conn)
    }

    return conn
  }

  /* ============ HELPERS =============== */
  private writeMetadata(): void {
    const peerInfo = this.localPeerInfo
    const metadata = peer.PeerInfoMessage.encode({
      addresses: peerInfo.AdressStringList,
      connectedAddr: peerInfo.connectedAddr?.toString(),
      pubKey: peerInfo.publicKey
    }).finish()
    this.fileSystem.writeFileSync(this.metadataPath, metadata)
  }
  private loadMetadata(): void {
    // Check if file exists
    if (this.fileSystem.existsSync(this.metadataPath)) {
      const metadata = <Uint8Array>this.fileSystem.readFileSync(this.metadataPath)
      const { addresses, connectedAddr, pubKey } = peer.PeerInfoMessage.decode(metadata)
      this.localPeerInfo = new PeerInfo(pubKey, addresses, connectedAddr)
    }
  }
}

export default PeerManager
export { SocialDiscovery }
