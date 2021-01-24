import os from 'os';
import fs from 'fs';
import path from 'path';
import PeerDHT from './peer-dht/PeerDHT';
import PeerInfo from '../peers/PeerInfo';
import KeyManager from '../keys/KeyManager';
import PeerServer from './peer-connection/PeerServer';
import NatTraversal from './nat-traversal/NatTraversal';
import { JSONMapReplacer, JSONMapReviver } from '../utils';
import * as peerInterface from '../proto/js/Peer_pb';
import PeerConnection from './peer-connection/PeerConnection';
import MulticastBroadcaster from '../peers/MulticastBroadcaster';
import { KeybaseIdentityProvider } from './identity-provider/default';
import IdentityProviderPlugin, { PolykeyProof } from './identity-provider/IdentityProvider';

class PeerManager {
  private fileSystem: typeof fs;

  private peerInfoMetadataPath: string;
  private peerStoreMetadataPath: string;
  private peerAliasMetadataPath: string;

  peerInfo: PeerInfo;
  // peerId -> PeerInfo
  private peerStore: Map<string, PeerInfo>;
  // peerId -> peerAlias
  private peerAlias: Map<string, string>;

  private keyManager: KeyManager;
  multicastBroadcaster: MulticastBroadcaster;
  identityProviderPlugins: Map<string, IdentityProviderPlugin> = new Map;

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
    identityProviderPlugins: IdentityProviderPlugin[] = [],
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
    } else if (this.keyManager.hasPublicKey() && !this.peerInfo) {
      this.peerInfo = new PeerInfo(this.keyManager.getPublicKey(), this.keyManager.pki.RootCert);
    }

    // add default identity provider plugins
    this.identityProviderPlugins.set(KeybaseIdentityProvider.name, KeybaseIdentityProvider);
    // add given identity provider plugins
    identityProviderPlugins.forEach(idP => this.identityProviderPlugins.set(idP.name.toLowerCase(), idP))

    this.multicastBroadcaster = new MulticastBroadcaster(
      (() => this.peerInfo).bind(this),
      this.hasPeer.bind(this),
      this.updatePeer.bind(this),
      this.keyManager,
    );

    ////////////
    // Server //
    ////////////
    this.peerServer = new PeerServer(this, this.keyManager);
    this.peerConnections = new Map();

    //////////////
    // Peer DHT //
    //////////////
    this.peerDHT = new PeerDHT(
      () => this.peerInfo.id,
      this.connectToPeer.bind(this),
      ((id: string) => this.getPeer(id)).bind(this),
      ((peerInfo: PeerInfo) => {
        if (!this.hasPeer(peerInfo.id)) {
          this.addPeer(peerInfo);
        }
      }).bind(this),
    );
    this.peerDHT.addPeers(this.listPeers());
    this.natTraversal = new NatTraversal(
      this.listPeers.bind(this),
      this.getPeer.bind(this),
      this.connectToPeer.bind(this),
      (() => this.peerInfo).bind(this),
      this.hasPeer.bind(this),
      this.updatePeer.bind(this),
    );
    this.setNatHandler(this.natTraversal.handleNatMessageGRPC.bind(this.natTraversal));
  }

  // Gets the status of the BackupService
  public get Status() {
    return {
      stealthMode: this.stealthMode,
    };
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
   * @param alias Optional alias for the new peer
   */
  addPeer(peerInfo: PeerInfo, alias?: string): string {
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
  updatePeer(peerInfo: PeerInfo): void {
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
  getPeer(id: string): PeerInfo | null {
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
   * Prove this keynode on an identity provider
   * @param identityPluginName The name of the identity plugin to be used (e.g. keybase or signal)
   * @param identifier Any unique identifying string (e.g. @github/john-smith or a phone number)
   */
  async proveKeynode(identityPluginName: string, identifier: string): Promise<PolykeyProof> {
    // parse with regex
    const plugin = this.identityProviderPlugins.get(identityPluginName.toLowerCase())
    if (!plugin) {
      throw Error(`no plugin found of the name '${identityPluginName}'`)
    }

    return await plugin.proveKeynode(identifier, this.peerInfo)
  }

  /**
   * Finds all keynodes advertised by a given gestalt given that gestalt's unique identifying string
   * @param identifier Any unique identifying string (e.g. @github/john-smith or a phone number)
   * @param timeout The timeout after which the trying is stopped
   */
  async findGestaltKeynodes(identifier: string, timeout?: number): Promise<string[]> {
    // parse with regex
    const tasks: Promise<PeerInfo[]>[] = []

    for (const idP of this.identityProviderPlugins.values()) {
      tasks.push(idP.determineKeynodes(identifier))
    }

    const peerInfoList = await Promise.race(tasks);

    if (!peerInfoList) {
      throw Error('could not find any keynodes advertised by identifier');
    }

    // add all found peers to the peer store if they are not in there already
    peerInfoList.forEach(p => { try { this.addPeer(p, `${identifier}-${p.id}`) } catch { } })

    // return a list of peer id's found
    return peerInfoList.map(p => p.id)
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
      this.keyManager,
      (() => this.peerInfo).bind(this),
      this.getPeer.bind(this),
      this.peerDHT.findPeer.bind(this.peerDHT),
      this.natTraversal.requestUDPHolePunchDirectly.bind(this.natTraversal),
      this.natTraversal.requestUDPHolePunchViaPeer.bind(this.natTraversal),
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
    const metadata = new peerInterface.PeerInfoMessage
    metadata.setPublicKey(this.peerInfo.publicKey)
    metadata.setRootCertificate(this.peerInfo.rootCertificate)
    if (this.peerInfo.peerAddress) {
      metadata.setPeerAddress(this.peerInfo.peerAddress?.toString())
    }
    if (this.peerInfo.apiAddress) {
      metadata.setApiAddress(this.peerInfo.apiAddress?.toString())
    }

    this.fileSystem.mkdirSync(path.dirname(this.peerInfoMetadataPath), { recursive: true });
    this.fileSystem.writeFileSync(this.peerInfoMetadataPath, metadata.serializeBinary());
    // write peer store
    const peerInfoList: peerInterface.PeerInfoMessage[] = [];
    for (const [_, peerInfo] of this.peerStore) {
      const peerInfoMessage = new peerInterface.PeerInfoMessage
      peerInfoMessage.setPublicKey(peerInfo.publicKey)
      peerInfoMessage.setRootCertificate(peerInfo.rootCertificate)
      if (peerInfo.peerAddress) {
        peerInfoMessage.setPeerAddress(peerInfo.peerAddress?.toString())
      }
      if (peerInfo.apiAddress) {
        peerInfoMessage.setApiAddress(peerInfo.apiAddress?.toString())
      }
      peerInfoList.push(peerInfoMessage);
    }

    const peerStoreMetadata = new peerInterface.PeerInfoListMessage
    peerStoreMetadata.setPeerInfoListList(peerInfoList)
    this.fileSystem.writeFileSync(this.peerStoreMetadataPath, peerStoreMetadata.serializeBinary());
    this.fileSystem.writeFileSync(this.peerAliasMetadataPath, JSON.stringify(this.peerAlias, JSONMapReplacer));
  }

  loadMetadata(): void {
    // load peer info if path exists
    if (this.fileSystem.existsSync(this.peerInfoMetadataPath)) {
      const metadata = this.fileSystem.readFileSync(this.peerInfoMetadataPath) as Uint8Array;
      const { publicKey, rootCertificate, peerAddress, apiAddress } = peerInterface.PeerInfoMessage.deserializeBinary(metadata).toObject();
      this.peerInfo = new PeerInfo(publicKey, rootCertificate, peerAddress, apiAddress);
    }
    // load peer store if path exists
    if (this.fileSystem.existsSync(this.peerStoreMetadataPath)) {
      const metadata = this.fileSystem.readFileSync(this.peerStoreMetadataPath) as Uint8Array;
      const { peerInfoListList } = peerInterface.PeerInfoListMessage.deserializeBinary(metadata).toObject();
      for (const peerInfoMessage of peerInfoListList) {
        const peerInfo = new PeerInfo(
          peerInfoMessage.publicKey!,
          peerInfoMessage.rootCertificate!,
          peerInfoMessage.peerAddress ?? undefined,
          peerInfoMessage.apiAddress ?? undefined,
        );
        this.peerStore.set(peerInfo.id, peerInfo);
      }
    }
    if (this.fileSystem.existsSync(this.peerAliasMetadataPath)) {
      this.peerAlias = JSON.parse(this.fileSystem.readFileSync(this.peerAliasMetadataPath).toString(), JSONMapReviver);
    }
  }
}

export default PeerManager;
