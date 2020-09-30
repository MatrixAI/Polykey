import os from 'os';
import fs from 'fs';
import path from 'path';
import TurnClient from './turn/TurnClient';
import KeyManager from '../keys/KeyManager';
import { peerInterface } from '../../proto/js/Peer';
import PeerInfo from '../peers/PeerInfo';
import PeerServer from './peer-connection/PeerServer';
import PeerConnection from './peer-connection/PeerConnection';
import MulticastBroadcaster from '../peers/MulticastBroadcaster';

interface SocialDiscovery {
  // Must return a public pgp key
  name: string;
  findUser(handle: string, service: string): Promise<string>;
}

const keybaseDiscovery: SocialDiscovery = {
  name: 'Keybase',
  findUser: async (handle: string, service: string): Promise<string> => {
    const url = `https://keybase.io/_/api/1.0/user/lookup.json?${service}=${handle}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      const pubKey = data.them[0].public_keys.primary.bundle;
      return pubKey;
    } catch (err) {
      throw Error(`User was not found: ${err.message}`);
    }
  },
};

type PeerManagerMetadata = {
  peerInfo: PeerInfo | null;
};

class PeerManager {
  private fileSystem: typeof fs;

  private peerInfoMetadataPath: string;
  private peerStoreMetadataPath: string;

  peerInfo: PeerInfo;
  private peerStore: Map<string, PeerInfo>;
  private keyManager: KeyManager;
  multicastBroadcaster: MulticastBroadcaster;
  socialDiscoveryServices: SocialDiscovery[];

  // Peer connections
  peerServer: PeerServer;
  private peerConnections: Map<string, PeerConnection>;
  turnClient: TurnClient;

  private stealthMode: boolean;

  constructor(
    polykeyPath: string = `${os.homedir()}/.polykey`,
    fileSystem: typeof fs,
    keyManager: KeyManager,
    peerInfo?: PeerInfo,
    socialDiscoveryServices: SocialDiscovery[] = [],
  ) {
    this.fileSystem = fileSystem;

    this.peerStore = new Map();

    this.fileSystem.mkdirSync(polykeyPath, { recursive: true });
    this.peerInfoMetadataPath = path.join(polykeyPath, '.peerInfo');
    this.peerStoreMetadataPath = path.join(polykeyPath, '.peerStore');

    // Set given variables
    this.keyManager = keyManager;
    this.socialDiscoveryServices = socialDiscoveryServices;

    // Load metadata with peer info
    this.loadMetadata();

    // Load peer store and local peer info
    if (peerInfo) {
      this.peerInfo = peerInfo;
      this.writeMetadata();
    } else if (this.keyManager.hasPublicKey()) {
      this.peerInfo = new PeerInfo(this.keyManager.getPublicKey());
    }

    this.socialDiscoveryServices = [];
    this.socialDiscoveryServices.push(keybaseDiscovery);
    for (const service of socialDiscoveryServices) {
      this.socialDiscoveryServices.push(service);
    }

    this.multicastBroadcaster = new MulticastBroadcaster(this, this.keyManager);

    ////////////
    // Server //
    ////////////
    this.peerServer = new PeerServer(this, this.keyManager);
    this.peerConnections = new Map();

    /////////////////
    // TURN Client //
    /////////////////
    this.turnClient = new TurnClient(this);
  }

  toggleStealthMode(active: boolean) {
    if (!this.stealthMode && active) {
      this.multicastBroadcaster.stopBroadcasting();
    } else if (this.stealthMode && !active) {
      this.multicastBroadcaster.startListening();
    }
    this.stealthMode = active;
  }

  setGitHandler(handler: (request: Uint8Array, publicKey: string) => Promise<Uint8Array>) {
    this.peerServer.handleGitRequest = handler;
  }

  setNatHandler(handler: (request: Uint8Array) => Promise<Uint8Array>) {
    this.peerServer.handleNatRequest = handler;
  }

  ////////////////
  // Peer store //
  ////////////////
  /**
   * Add a peer's info to the peerStore
   * @param peerInfo Info of the peer to be added
   */
  addPeer(peerInfo: PeerInfo): void {
    const publicKey = PeerInfo.formatPublicKey(peerInfo.publicKey);
    if (this.hasPeer(publicKey)) {
      throw Error('peer already exists in peer store');
    }
    this.peerStore.set(publicKey, peerInfo.deepCopy());
    this.writeMetadata();
  }

  /**
   * Update a peer's info in the peerStore
   * @param peerInfo Info of the peer to be updated
   */
  updatePeer(peerInfo: PeerInfo): void {
    const publicKey = PeerInfo.formatPublicKey(peerInfo.publicKey);
    if (!this.hasPeer(publicKey)) {
      throw Error('peer does not exist in peer store');
    }
    this.peerStore.set(publicKey, peerInfo.deepCopy());
    this.writeMetadata();
  }

  /**
   * Retrieves a peer for the given public key
   * @param publicKey Public key of the desired peer
   */
  getPeer(publicKey: string): PeerInfo | null {
    return this.peerStore.get(PeerInfo.formatPublicKey(publicKey))?.deepCopy() ?? null;
  }

  /**
   * Determines if the peerStore contains the desired peer
   * @param publicKey Public key of the desired peer
   */
  hasPeer(publicKey: string): boolean {
    return this.peerStore.has(PeerInfo.formatPublicKey(publicKey));
  }

  /**
   * List all peer public keys in the peer store
   */
  listPeers(): string[] {
    return Array.from(this.peerStore.values()).map((p) => p.publicKey);
  }

  //////////////////////
  // Social discovery //
  //////////////////////
  /**
   * Finds an existing peer using multicast peer discovery
   * @param publicKey Public key of the desired peer
   */
  async findPublicKey(publicKey: string, timeout?: number): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.multicastBroadcaster.startListening();
      this.multicastBroadcaster.on('found', (foundPublicKey: string) => {
        if (PeerInfo.formatPublicKey(foundPublicKey) == PeerInfo.formatPublicKey(publicKey)) {
          resolve(true);
        }
      });

      setTimeout(() => reject(Error('peer discovery timed out')), timeout && timeout != 0 ? timeout : 5e4);
    });
  }

  /**
   * Finds an existing peer given a social service and handle
   * @param username Username (e.g. @github/john-smith)
   */
  async findSocialUser(handle: string, service: string, timeout?: number): Promise<boolean> {
    // parse with regex
    const tasks = this.socialDiscoveryServices.map((s) => s.findUser(handle, service));

    const pubKeyOrFail = await Promise.race(tasks);

    if (!pubKeyOrFail) {
      throw Error('Could not find public key from services');
    }

    return await this.findPublicKey(pubKeyOrFail, timeout);
  }

  ///////////////////////
  // Peers Connections //
  ///////////////////////
  /**
   * Get a secure connection to the peer
   * @param publicKey Public key of an existing peer or address of new peer
   */
  connectToPeer(publicKey: string): PeerConnection {
    // Throw error if trying to connect to self
    if (publicKey == this.peerInfo.publicKey) {
      throw Error('Cannot connect to self');
    }

    const existingSocket = this.peerConnections.get(publicKey);
    if (existingSocket) {
      return existingSocket;
    }

    // try to create a connection to the address
    const peerConnection = new PeerConnection(publicKey, this.keyManager, this);

    this.peerConnections.set(publicKey, peerConnection);

    return peerConnection;
  }

  async pingPeer(publicKey: string, timeout?: number): Promise<boolean> {
    const peerConnection = this.connectToPeer(publicKey);
    return await peerConnection.pingPeer(timeout);
  }

  /* ============ HELPERS =============== */
  private writeMetadata(): void {
    // write peer info
    const peerInfo = this.peerInfo;
    const metadata = peerInterface.PeerInfoMessage.encodeDelimited({
      publicKey: peerInfo.publicKey,
      peerAddress: peerInfo.peerAddress?.toString(),
      relayPublicKey: peerInfo.relayPublicKey,
    }).finish();
    this.fileSystem.writeFileSync(this.peerInfoMetadataPath, metadata);
    // write peer store
    const peerInfoList: peerInterface.PeerInfoMessage[] = [];
    for (const [publicKey, peerInfo] of this.peerStore) {
      peerInfoList.push(
        new peerInterface.PeerInfoMessage({
          publicKey: peerInfo.publicKey,
          peerAddress: peerInfo.peerAddress?.toString(),
          relayPublicKey: peerInfo.relayPublicKey,
        }),
      );
    }
    const peerStoreMetadata = peerInterface.PeerInfoListMessage.encodeDelimited({ peerInfoList }).finish();
    this.fileSystem.writeFileSync(this.peerStoreMetadataPath, peerStoreMetadata);
  }

  loadMetadata(): void {
    // load peer info if path exists
    if (this.fileSystem.existsSync(this.peerInfoMetadataPath)) {
      const metadata = <Uint8Array>this.fileSystem.readFileSync(this.peerInfoMetadataPath);
      const { publicKey, relayPublicKey, peerAddress, apiAddress } = peerInterface.PeerInfoMessage.decodeDelimited(
        metadata,
      );
      this.peerInfo = new PeerInfo(publicKey, relayPublicKey, peerAddress, apiAddress);
    }
    // load peer store if path exists
    if (this.fileSystem.existsSync(this.peerStoreMetadataPath)) {
      const metadata = <Uint8Array>this.fileSystem.readFileSync(this.peerStoreMetadataPath);
      const { peerInfoList } = peerInterface.PeerInfoListMessage.decodeDelimited(metadata);
      for (const peerInfoMessage of peerInfoList) {
        const peerInfo = new PeerInfo(
          peerInfoMessage.publicKey!,
          peerInfoMessage.relayPublicKey ?? undefined,
          peerInfoMessage.peerAddress ?? undefined,
          peerInfoMessage.apiAddress ?? undefined,
        );
        this.peerStore.set(peerInfo.publicKey, peerInfo);
      }
    }
  }
}

export default PeerManager;
export { SocialDiscovery };
