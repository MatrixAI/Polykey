import fetch from 'node-fetch'
import KeyManager from "@polykey/KeyManager";
import ConnectionManager from './ConnectionManager';
import PeerInfo from "@polykey/peer-store/PeerInfo";
import PeerStore from "@polykey/peer-store/PeerStore";
import { firstPromiseFulfilled } from '@polykey/utils';
import MulticastBroadcaster from "@polykey/p2p/MulticastBroadcaster";

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

class PeerManager {
  peerStore: PeerStore
  keyManager: KeyManager
  multicastBroadcaster: MulticastBroadcaster
  connectionManager: ConnectionManager
  private socialDiscoveryServices: SocialDiscovery[]

  constructor(
    peerInfo: PeerInfo,
    keyManager: KeyManager,
    socialDiscoveryServices: SocialDiscovery[] = []
  ) {
    this.peerStore = new PeerStore(peerInfo)
    this.keyManager = keyManager
    this.socialDiscoveryServices = socialDiscoveryServices

    this.socialDiscoveryServices = []
    this.socialDiscoveryServices.push(keybaseDiscovery)
    for (const service of socialDiscoveryServices) {
      this.socialDiscoveryServices.push(service)
    }

    this.multicastBroadcaster = new MulticastBroadcaster(this.peerStore, this.keyManager)

    this.connectionManager = new ConnectionManager(this.peerStore)
  }

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
}

export default PeerManager
export { SocialDiscovery }
