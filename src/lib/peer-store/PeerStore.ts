import PeerInfo from "@polykey/peer-store/PeerInfo"

/**
 * Responsible for managing known peers, as well as their addresses and metadata
 */
class PeerStore {
  localPeerInfo: PeerInfo
  peers: Map<string, PeerInfo>
  constructor(peerInfo: PeerInfo) {
    this.localPeerInfo = peerInfo
    this.peers = new Map()
  }

  /**
   * Stores the peerInfo of a new peer.
   * If already exist, its info is updated.
   */
  put(peerInfo: PeerInfo): void {
    // Already know the peer?
    if (this.has(peerInfo.publicKey)) {
      this.update(peerInfo)
    } else {
      this.add(peerInfo)
    }
  }

  /**
   * Add a new peer to the store.
   */
  add(peerInfo: PeerInfo): void {
    this.peers.set(peerInfo.publicKey, peerInfo)
  }

  /**
   * Updates an already known peer.
   */
  update(peerInfo: PeerInfo): void {
    this.peers.set(peerInfo.publicKey, peerInfo)
  }

  /**
   * Get the info to the given id.
   */
  get(pubKey: string): PeerInfo | null {
    return this.peers.get(pubKey) ?? null
  }

  /**
   * Has the info to the given id.
   */
  has(pubKey: string): boolean {
    return this.peers.has(pubKey)
  }
}

export default PeerStore
