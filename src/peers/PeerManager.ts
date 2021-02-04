import os from 'os';
import fs from 'fs';
import path from 'path';
import { LinkClaimIdentity, LinkInfo } from '../links';
import PeerDHT from './peer-dht/PeerDHT';
import KeyManager from '../keys/KeyManager';
import PeerServer from './peer-connection/PeerServer';
import NatTraversal from './nat-traversal/NatTraversal';
import { JSONMapReplacer, JSONMapReviver } from '../utils';
import PeerConnection from './peer-connection/PeerConnection';
import { PeerInfo, PeerInfoReadOnly } from '../peers/PeerInfo';
import MulticastBroadcaster from '../peers/MulticastBroadcaster';
import PublicKeyInfrastructure from '../peers/pki/PublicKeyInfrastructure';

class PeerManager {
  private fileSystem: typeof fs;

  private peerInfoMetadataPath: string;
  private peerStoreMetadataPath: string;
  private peerAliasMetadataPath: string;

  /////////
  // PKI //
  /////////
  pki: PublicKeyInfrastructure;

  peerInfo: PeerInfo;
  // peerId -> PeerInfoReadOnly
  private peerStore: Map<string, PeerInfoReadOnly>;
  // peerId -> peerAlias
  private peerAlias: Map<string, string>;

  private keyManager: KeyManager;
  multicastBroadcaster: MulticastBroadcaster;

  // Peer connections
  peerServer: PeerServer;
  private peerConnections: Map<string, PeerConnection>;
  peerDHT: PeerDHT;
  natTraversal: NatTraversal;

  private stealthMode: boolean;

  constructor(
    polykeyPath = `${os.homedir()}/.polykey`,
    fileSystem: typeof fs,
    keyManager: KeyManager,
    peerInfo?: PeerInfo,
  ) {
    this.fileSystem = fileSystem;

    this.peerStore = new Map();
    this.peerAlias = new Map();

    this.fileSystem.mkdirSync(polykeyPath, { recursive: true });
    this.peerInfoMetadataPath = path.join(polykeyPath, '.peers', 'PeerInfo');
    this.peerStoreMetadataPath = path.join(polykeyPath, '.peers', 'PeerStore');
    this.peerAliasMetadataPath = path.join(polykeyPath, '.peers', 'PeerAlias');

    // Set given variables
    this.keyManager = keyManager;

    // Load metadata with peer info
    this.loadMetadata();

    // Load peer store and local peer info
    if (peerInfo) {
      this.peerInfo = peerInfo;
      this.writeMetadata();
    } else if (this.keyManager.getKeyPair().publicKey && !this.peerInfo) {
      this.peerInfo = new PeerInfo('', this.keyManager.getPublicKeyString());
    }

    this.multicastBroadcaster = new MulticastBroadcaster(
      (() => this.peerInfo).bind(this),
      this.hasPeer.bind(this),
      this.addPeer.bind(this),
      this.updatePeer.bind(this),
      this.keyManager,
    );

    ////////////
    // Server //
    ////////////
    this.peerServer = new PeerServer(this);
    this.peerConnections = new Map();

    //////////////
    // Peer DHT //
    //////////////
    this.peerDHT = new PeerDHT(
      () => this.peerInfo.id,
      this.connectToPeer.bind(this),
      this.getPeer.bind(this),
      ((peerInfo: PeerInfoReadOnly) => {
        if (!this.hasPeer(peerInfo.id)) {
          this.addPeer(peerInfo);
        } else {
          this.updatePeer(peerInfo)
        }
      }).bind(this),
    );
    // add all peers to peerDHT from peerStore
    this.peerDHT.addPeers(this.listPeers());

    // initialize nat traversal
    this.natTraversal = new NatTraversal(
      this.listPeers.bind(this),
      this.getPeer.bind(this),
      this.connectToPeer.bind(this),
      (() => this.peerInfo).bind(this),
      this.hasPeer.bind(this),
      this.updatePeer.bind(this),
      this.keyManager.getPrivateKey.bind(this.keyManager),
    );

    /////////
    // PKI //
    /////////
    this.pki = new PublicKeyInfrastructure(
      polykeyPath,
      this.fileSystem,
      (() => this.peerInfo).bind(this),
      this.keyManager.getPrivateKey.bind(this.keyManager),
    );
  }

  // Gets the status of the BackupService
  public get Status() {
    return {
      stealthMode: this.stealthMode,
    };
  }

  async start() {
    this.pki.loadMetadata()
    this.multicastBroadcaster.startBroadcasting()
    try {
      await this.peerServer.start()
    } catch (error) {
      // no throw
    }
    await this.natTraversal.start()
  }

  async stop() {
    this.multicastBroadcaster.stopBroadcasting()
    await this.peerServer.stop()
    await this.natTraversal.stop()
  }

  toggleStealthMode(active: boolean) {
    if (!this.stealthMode && active) {
      this.multicastBroadcaster.stopBroadcasting();
    } else if (this.stealthMode && !active) {
      this.multicastBroadcaster.startListening();
    }
    this.stealthMode = active;
  }

  setGitHandlers(
    handleGitInfoRequest: (vaultName: string) => Promise<Uint8Array>,
    handleGitPackRequest: (vaultName: string, body: Buffer) => Promise<Uint8Array>,
    handleGetVaultNames: () => Promise<string[]>,
  ) {
    this.peerServer.handleGitInfoRequest = handleGitInfoRequest;
    this.peerServer.handleGitPackRequest = handleGitPackRequest;
    this.peerServer.handleGetVaultNames = handleGetVaultNames;
  }

  ////////////////
  // Peer store //
  ////////////////
  /**
   * Add a peer's info to the peerStore
   * @param peerInfo Info of the peer to be added
   * @param alias Optional alias for the new peer
   */
  addPeer(peerInfo: PeerInfoReadOnly, alias?: string): string {
    const peerId = peerInfo.id;
    if (this.hasPeer(peerId)) {
      throw Error('peer already exists in peer store');
    }
    if (peerId == this.peerInfo.id) {
      throw Error('cannot add self to store');
    }
    this.peerStore.set(peerInfo.id, peerInfo.deepCopy());
    if (alias) {
      try {
        this.peerAlias.set(alias, peerInfo.id)
      } catch (error) {
      }
    }
    this.peerDHT.addPeer(peerInfo.id);
    this.writeMetadata();
    return peerInfo.id;
  }

  /**
   * Add an alias for a particular peer
   * @param peerId Peer ID of an existing peer
   * @param alias Alias of peer
   */
  setPeerAlias(peerId: string, alias: string): void {
    if (!this.hasPeer(peerId)) {
      throw Error('peer does not exist in peer store');
    }
    this.peerAlias.set(peerId, alias);
    this.writeMetadata();
  }

  /**
   * Add a peer's info to the peerStore
   * @param peerId Peer ID of an existing peer
   */
  unsetPeerAlias(peerId: string): void {
    if (!this.peerAlias.has(peerId)) {
      throw Error(`no alias set for peerId: '${peerId}'`);
    }
    this.peerAlias.delete(peerId);
    this.writeMetadata();
  }

  /**
   * Retrieve a peer's alias
   * @param peerId Peer ID of an existing peer
   */
  getPeerAlias(peerId: string): string | undefined {
    return this.peerAlias.get(peerId) ?? undefined;
  }

  /**
   * Update a peer's info in the peerStore
   * @param peerInfo Info of the peer to be updated
   */
  updatePeer(peerInfo: PeerInfoReadOnly): void {
    if (!this.hasPeer(peerInfo.id)) {
      throw Error('peer does not exist in peer store');
    }
    this.peerStore.set(peerInfo.id, peerInfo.deepCopy());
    this.writeMetadata();
  }

  /**
   * Delete a peer from the peerStore
   * @param peerInfo Info of the peer to be updated
   */
  deletePeer(id: string): void {
    if (!this.hasPeer(id)) {
      throw Error('peer does not exist in peer store');
    }
    this.peerStore.delete(id);
    this.peerDHT.deletePeer(id);
    this.writeMetadata();
  }

  /**
   * Retrieves a peer for the given public key
   * @param publicKey ID of the desired peer
   */
  getPeer(id: string): PeerInfoReadOnly | null {
    return this.peerStore.get(id)?.deepCopy() ?? null;
  }

  /**
   * Determines if the peerStore contains the desired peer
   * @param id ID of the desired peer
   */
  hasPeer(id: string): boolean {
    return this.peerStore.has(id);
  }

  /**
   * List all peer public keys in the peer store
   */
  listPeers(): string[] {
    return Array.from(this.peerStore.values()).map((p) => p.id);
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
   * Retrieve all the link claims for which a particular peer is linked to
   * @param peerId The id of the peer for which link claims are to be found
   */
  // TODO: make it follow second degree claims (perhaps as an async generator).
  // at the moment it only retrieves the link claims on the single requested keynode
  async findLinkClaims(peerId: string): Promise<LinkInfo[]> {
    if (this.peerInfo.id == peerId) {
      return this.peerInfo?.linkInfoList ?? []
    } else {
      const peerInfo = this.getPeer(peerId)
      if (!peerInfo) {
        throw Error(`peer does not exist in peer store for peerId: ${peerId}`)
      }
      return peerInfo?.linkInfoList ?? []
    }
  }

  async getLinkInfos(id: string): Promise<LinkInfo[]> {
    const targetPeerInfo = (await this.peerDHT.findPeer(id))?.targetPeerInfo
    return targetPeerInfo?.linkInfoList ?? []
  }

  // TODO: find a better home for these next two methods (i.e. makeLinkClaimIdentity and verifyLinkClaim) or leave them?
  /**
   * Create a link claim identity that claims this keynode and an already authenticated
   * provider and identity
   * @param providerKey The key to identify the already authenticated provider
   * @param identityKey The key that identifies a particular identity on the provider
   */
  async makeLinkClaimIdentity(providerKey: string, identityKey: string): Promise<LinkClaimIdentity> {
    const toBeSigned = {
      node: JSON.stringify(this.peerInfo.publicKey),
      identity: identityKey,
      provider: providerKey,
      dateIssued: (new Date(Date.now())).toISOString(),
    }
    const signature = await this.keyManager.signData((JSON as any).canonicalize(toBeSigned))
    const linkClaim: LinkClaimIdentity = {
      type: 'identity',
      ...toBeSigned,
      signature,
    }
    return linkClaim
  }
  // this method is for the gestalt graph to make sure what it is claiming is verified
  // i.e. the a signature from the public key attached to it is valid
  async verifyLinkClaim(linkClaim: LinkClaimIdentity): Promise<boolean> {
    const linkClaimIdentity = linkClaim as LinkClaimIdentity
    const toBeVerified = {
      node: linkClaimIdentity.node,
      identity: linkClaimIdentity.identity,
      provider: linkClaimIdentity.provider,
      dateIssued: linkClaimIdentity.dateIssued,
    }
    const signature = linkClaimIdentity.signature
    const publicKey = PeerInfo.formatPublicKey(JSON.stringify(linkClaimIdentity.node))
    return await this.keyManager.verifyData((JSON as any).canonicalize(toBeVerified), signature, publicKey)
  }

  ///////////////////////
  // Peers Connections //
  ///////////////////////
  /**
   * Get a secure connection to the peer
   * @param peerId Peer ID of an existing peer
   */
  connectToPeer(peerId: string): PeerConnection {
    // Throw error if trying to connect to self
    if (peerId == this.peerInfo.id) {
      throw Error('Cannot connect to self');
    }

    const existingSocket = this.peerConnections.get(peerId);
    if (existingSocket) {
      return existingSocket;
    }

    // try to create a connection to the address
    const peerConnection = new PeerConnection(
      peerId,
      this.pki,
      this.getPeer.bind(this),
      this.peerDHT.findPeer.bind(this.peerDHT),
      // this.natTraversal.requestUDPHolePunchDirectly.bind(this.natTraversal),
      // this.natTraversal.requestUDPHolePunchViaPeer.bind(this.natTraversal),
    );

    this.peerConnections.set(peerId, peerConnection);

    return peerConnection;
  }

  async pingPeer(publicKey: string, timeout?: number): Promise<boolean> {
    const peerConnection = this.connectToPeer(publicKey);
    return await peerConnection.pingPeer(timeout);
  }

  /* ============ HELPERS =============== */
  writeMetadata(): void {
    // write peer info
    this.fileSystem.mkdirSync(path.dirname(this.peerInfoMetadataPath), { recursive: true });
    const peerInfoPem = this.peerInfo.toX509Pem(this.keyManager.getPrivateKey())
    this.fileSystem.writeFileSync(this.peerInfoMetadataPath, peerInfoPem);
    // write peer store
    const peerInfoList: string[] = [];
    for (const [_, peerInfo] of this.peerStore) {
      peerInfoList.push(peerInfo.pem);
    }

    this.fileSystem.writeFileSync(this.peerStoreMetadataPath, JSON.stringify(peerInfoList));
    this.fileSystem.writeFileSync(this.peerAliasMetadataPath, JSON.stringify(this.peerAlias, JSONMapReplacer));
  }

  loadMetadata(): void {
    // load peer info if path exists
    if (this.fileSystem.existsSync(this.peerInfoMetadataPath)) {
      const metadata = this.fileSystem.readFileSync(this.peerInfoMetadataPath).toString();
      this.peerInfo = PeerInfo.fromX509Pem(metadata);
    }
    // load peer store if path exists
    if (this.fileSystem.existsSync(this.peerStoreMetadataPath)) {
      const metadata = this.fileSystem.readFileSync(this.peerStoreMetadataPath).toString();
      for (const peerInfoPem of JSON.parse(metadata)) {
        const peerInfo = new PeerInfoReadOnly(peerInfoPem);
        this.peerStore.set(peerInfo.id, peerInfo);
      }
    }
    // load the peer aliases
    if (this.fileSystem.existsSync(this.peerAliasMetadataPath)) {
      this.peerAlias = JSON.parse(this.fileSystem.readFileSync(this.peerAliasMetadataPath).toString(), JSONMapReviver);
    }
  }
}

export default PeerManager;
