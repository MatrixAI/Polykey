import os from 'os';
import fs from 'fs';
import path from 'path';
import Logger from '@matrixai/logger'
import NodeDHT from './dht/NodeDHT';
import Network from '../network/Network';
import KeyManager from '../keys/KeyManager';
import NodeServer from './node-connection/NodeServer';
import { LinkClaimIdentity, LinkInfo } from '../links';
import { JSONMapReplacer, JSONMapReviver } from '../utils';
import NodeConnection from './node-connection/NodeConnection';
import { NodeInfo, NodeInfoReadOnly } from './NodeInfo';
import PublicKeyInfrastructure from './pki/PublicKeyInfrastructure';
import MulticastBroadcaster from '../network/multicast/MulticastBroadcaster';

class NodeManager {
  private fileSystem: typeof fs;
  private logger: Logger;

  private nodeInfoMetadataPath: string;
  private nodeStoreMetadataPath: string;
  private nodeAliasMetadataPath: string;

  /////////
  // PKI //
  /////////
  pki: PublicKeyInfrastructure;

  nodeInfo: NodeInfo;
  // nodeId -> NodeInfoReadOnly
  private nodeStore: Map<string, NodeInfoReadOnly>;
  // nodeId -> nodeAlias
  private nodeAlias: Map<string, string>;

  private keyManager: KeyManager;
  multicastBroadcaster: MulticastBroadcaster;

  // Node connections
  nodeServer: NodeServer;
  private nodeConnections: Map<string, NodeConnection>;
  nodeDHT: NodeDHT;
  network: Network;

  private stealthMode: boolean;

  constructor(
    polykeyPath = `${os.homedir()}/.polykey`,
    fileSystem: typeof fs,
    keyManager: KeyManager,
    logger: Logger,
    nodeInfo?: NodeInfo,
  ) {
    this.fileSystem = fileSystem;

    this.logger = logger;

    this.nodeStore = new Map();
    this.nodeAlias = new Map();

    this.fileSystem.mkdirSync(polykeyPath, { recursive: true });
    this.nodeInfoMetadataPath = path.join(polykeyPath, '.nodes', 'NodeInfo');
    this.nodeStoreMetadataPath = path.join(polykeyPath, '.nodes', 'NodeStore');
    this.nodeAliasMetadataPath = path.join(polykeyPath, '.nodes', 'NodeAlias');

    // Set given variables
    this.keyManager = keyManager;

    // Load metadata with node info
    this.loadMetadata();

    // Load node store and local node info
    if (nodeInfo) {
      this.nodeInfo = nodeInfo;
      this.writeMetadata();
    } else if (this.keyManager.getKeyPair().publicKey && !this.nodeInfo) {
      this.nodeInfo = new NodeInfo('', this.keyManager.getPublicKeyString());
    }

    this.multicastBroadcaster = new MulticastBroadcaster(
      (() => this.nodeInfo).bind(this),
      this.hasNode.bind(this),
      this.addNode.bind(this),
      this.updateNode.bind(this),
      this.keyManager,
    );

    ////////////
    // Server //
    ////////////
    this.nodeServer = new NodeServer(
      this,
      this.logger.getChild('NodeServer'),
    );
    this.nodeConnections = new Map();

    //////////////
    // Node DHT //
    //////////////
    this.nodeDHT = new NodeDHT(
      () => this.nodeInfo.id,
      this.connectToNode.bind(this),
      this.getNodeInfo.bind(this),
      ((nodeInfo: NodeInfoReadOnly) => {
        if (!this.hasNode(nodeInfo.id)) {
          this.addNode(nodeInfo);
        } else {
          this.updateNode(nodeInfo);
        }
      }).bind(this),
    );
    // add all nodes to nodeDHT from nodeStore
    this.nodeDHT.addNodes(this.listNodes());

    // initialize nat traversal
    this.network = new Network(
      this.listNodes.bind(this),
      this.getNodeInfo.bind(this),
      this.updateNode.bind(this),
      this.connectToNode.bind(this),
      (() => this.nodeInfo).bind(this),
      this.keyManager.getPrivateKey.bind(this.keyManager),
      this.logger.getChild('Network'),
    );

    /////////
    // PKI //
    /////////
    this.pki = new PublicKeyInfrastructure(
      polykeyPath,
      this.fileSystem,
      (() => this.nodeInfo).bind(this),
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
    this.pki.loadMetadata();
    this.multicastBroadcaster.startBroadcasting();
    try {
      await this.nodeServer.start();
    } catch (error) {
      // no throw
    }
    await this.network.start();
  }

  async stop() {
    this.multicastBroadcaster.stopBroadcasting();
    await this.nodeServer.stop();
    await this.network.stop();
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
    handleGitPackRequest: (
      vaultName: string,
      body: Buffer,
    ) => Promise<Uint8Array>,
    handleGetVaultNames: () => Promise<string[]>,
  ) {
    this.nodeServer.handleGitInfoRequest = handleGitInfoRequest;
    this.nodeServer.handleGitPackRequest = handleGitPackRequest;
    this.nodeServer.handleGetVaultNames = handleGetVaultNames;
  }

  ////////////////
  // Node store //
  ////////////////
  /**
   * Add a node's info to the nodeStore
   * @param nodeInfo Info of the node to be added
   * @param alias Optional alias for the new node
   */
  addNode(nodeInfo: NodeInfoReadOnly, alias?: string): string {
    const nodeId = nodeInfo.id;
    if (this.hasNode(nodeId)) {
      throw Error('node already exists in node store');
    }
    if (nodeId == this.nodeInfo.id) {
      throw Error('cannot add self to store');
    }
    this.nodeStore.set(nodeInfo.id, nodeInfo.deepCopy());
    if (alias) {
      try {
        this.nodeAlias.set(alias, nodeInfo.id);
      } catch (error) {}
    }
    this.nodeDHT.addNode(nodeInfo.id);
    this.writeMetadata();
    return nodeInfo.id;
  }

  /**
   * Add an alias for a particular node
   * @param nodeId ID of an existing node
   * @param alias Alias of node
   */
  setNodeAlias(nodeId: string, alias: string): void {
    if (!this.hasNode(nodeId)) {
      throw Error('node does not exist in node store');
    }
    this.nodeAlias.set(nodeId, alias);
    this.writeMetadata();
  }

  /**
   * Add a node's info to the nodeStore
   * @param nodeId Node ID of an existing node
   */
  unsetNodeAlias(nodeId: string): void {
    if (!this.nodeAlias.has(nodeId)) {
      throw Error(`no alias set for nodeId: '${nodeId}'`);
    }
    this.nodeAlias.delete(nodeId);
    this.writeMetadata();
  }

  /**
   * Retrieve a node's alias
   * @param nodeId Node ID of an existing node
   */
  getNodeAlias(nodeId: string): string | undefined {
    return this.nodeAlias.get(nodeId) ?? undefined;
  }

  /**
   * Update a node's info in the nodeStore
   * @param nodeInfo Info of the node to be updated
   */
  updateNode(nodeInfo: NodeInfoReadOnly): void {
    if (!this.hasNode(nodeInfo.id)) {
      throw Error('node does not exist in node store');
    }
    this.nodeStore.set(nodeInfo.id, nodeInfo.deepCopy());
    this.writeMetadata();
  }

  /**
   * Delete a node from the nodeStore
   * @param nodeInfo Info of the node to be updated
   */
  deleteNodeInfo(id: string): void {
    if (!this.hasNode(id)) {
      throw Error('node does not exist in node store');
    }
    this.nodeStore.delete(id);
    this.nodeDHT.deleteNode(id);
    this.writeMetadata();
  }

  /**
   * Retrieves a node for the given public key
   * @param publicKey ID of the desired node
   */
  getNodeInfo(id: string): NodeInfoReadOnly | null {
    return this.nodeStore.get(id)?.deepCopy() ?? null;
  }

  /**
   * Determines if the nodeStore contains the desired node
   * @param id ID of the desired node
   */
  hasNode(id: string): boolean {
    return this.nodeStore.has(id);
  }

  /**
   * List all node public keys in the node store
   */
  listNodes(): string[] {
    return Array.from(this.nodeStore.values()).map((p) => p.id);
  }

  //////////////////////
  // Social discovery //
  //////////////////////
  /**
   * Finds an existing node using multicast node discovery
   * @param publicKey Public key of the desired node
   */
  async findPublicKey(publicKey: string, timeout?: number): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.multicastBroadcaster.startListening();
      this.multicastBroadcaster.on('found', (foundPublicKey: string) => {
        if (
          NodeInfo.formatPublicKey(foundPublicKey) ==
          NodeInfo.formatPublicKey(publicKey)
        ) {
          resolve(true);
        }
      });

      setTimeout(
        () => reject(Error('node discovery timed out')),
        timeout && timeout != 0 ? timeout : 5e4,
      );
    });
  }

  /**
   * Retrieve all the link claims for which a particular node is linked to
   * @param nodeId The id of the node for which link claims are to be found
   */
  // TODO: make it follow second degree claims (perhaps as an async generator).
  // at the moment it only retrieves the link claims on the single requested keynode
  async findLinkClaims(nodeId: string): Promise<LinkInfo[]> {
    if (this.nodeInfo.id == nodeId) {
      return this.nodeInfo?.linkInfoList ?? [];
    } else {
      const nodeInfo = this.getNodeInfo(nodeId);
      if (!nodeInfo) {
        throw Error(`node does not exist in node store for nodeId: ${nodeId}`);
      }
      return nodeInfo?.linkInfoList ?? [];
    }
  }

  async getLinkInfos(id: string): Promise<LinkInfo[]> {
    const targetNodeInfo = (await this.nodeDHT.findNode(id))?.targetNodeInfo;
    return targetNodeInfo?.linkInfoList ?? [];
  }

  // TODO: find a better home for these next two methods (i.e. makeLinkClaimIdentity and verifyLinkClaim) or leave them?
  /**
   * Create a link claim identity that claims this keynode and an already authenticated
   * provider and identity
   * @param providerKey The key to identify the already authenticated provider
   * @param identityKey The key that identifies a particular identity on the provider
   */
  async makeLinkClaimIdentity(
    providerKey: string,
    identityKey: string,
  ): Promise<LinkClaimIdentity> {
    const toBeSigned = {
      node: JSON.stringify(this.nodeInfo.publicKey),
      identity: identityKey,
      provider: providerKey,
      dateIssued: new Date(Date.now()).toISOString(),
    };
    const signature = await this.keyManager.signData(
      (JSON as any).canonicalize(toBeSigned),
    );
    const linkClaim: LinkClaimIdentity = {
      type: 'identity',
      ...toBeSigned,
      signature,
    };
    return linkClaim;
  }
  // this method is for the gestalt graph to make sure what it is claiming is verified
  // i.e. the a signature from the public key attached to it is valid
  async verifyLinkClaim(linkClaim: LinkClaimIdentity): Promise<boolean> {
    const linkClaimIdentity = linkClaim as LinkClaimIdentity;
    const toBeVerified = {
      node: linkClaimIdentity.node,
      identity: linkClaimIdentity.identity,
      provider: linkClaimIdentity.provider,
      dateIssued: linkClaimIdentity.dateIssued,
    };
    const signature = linkClaimIdentity.signature;
    const publicKey = NodeInfo.formatPublicKey(
      JSON.stringify(linkClaimIdentity.node),
    );
    return await this.keyManager.verifyData(
      (JSON as any).canonicalize(toBeVerified),
      signature,
      publicKey,
    );
  }

  //////////////////////
  // Node Connections //
  //////////////////////
  /**
   * Get a secure connection to the node
   * @param nodeId ID of an existing node
   */
  connectToNode(nodeId: string): NodeConnection {
    // Throw error if trying to connect to self
    if (nodeId == this.nodeInfo.id) {
      throw Error('Cannot connect to self');
    }

    // const existingSocket = this.nodeConnections.get(nodeId);
    // if (existingSocket) {
    //   return existingSocket;
    // }

    // try to create a connection to the address
    const nodeConnection = new NodeConnection(
      nodeId,
      this.pki,
      this.getNodeInfo.bind(this),
      this.nodeDHT.findNode.bind(this.nodeDHT),
      this.logger.getChild('NodeConnection'),
    );

    this.nodeConnections.set(nodeId, nodeConnection);

    return nodeConnection;
  }

  async pingNode(publicKey: string, timeout?: number): Promise<boolean> {
    const nodeConnection = this.connectToNode(publicKey);
    return await nodeConnection.pingNode(timeout);
  }

  /* ============ HELPERS =============== */
  writeMetadata(): void {
    // write node info
    this.fileSystem.mkdirSync(path.dirname(this.nodeInfoMetadataPath), {
      recursive: true,
    });
    const nodeInfoPem = this.nodeInfo.toX509Pem(
      this.keyManager.getPrivateKey(),
    );
    this.fileSystem.writeFileSync(this.nodeInfoMetadataPath, nodeInfoPem);
    // write node store
    const nodeInfoList: string[] = [];
    for (const [_, nodeInfo] of this.nodeStore) {
      nodeInfoList.push(nodeInfo.pem);
    }

    this.fileSystem.writeFileSync(
      this.nodeStoreMetadataPath,
      JSON.stringify(nodeInfoList),
    );
    this.fileSystem.writeFileSync(
      this.nodeAliasMetadataPath,
      JSON.stringify(this.nodeAlias, JSONMapReplacer),
    );
  }

  loadMetadata(): void {
    // load node info if path exists
    if (this.fileSystem.existsSync(this.nodeInfoMetadataPath)) {
      const metadata = this.fileSystem
        .readFileSync(this.nodeInfoMetadataPath)
        .toString();
      this.nodeInfo = NodeInfo.fromX509Pem(metadata);
    }
    // load node store if path exists
    if (this.fileSystem.existsSync(this.nodeStoreMetadataPath)) {
      const metadata = this.fileSystem
        .readFileSync(this.nodeStoreMetadataPath)
        .toString();
      for (const nodeInfoPem of JSON.parse(metadata)) {
        const nodeInfo = new NodeInfoReadOnly(nodeInfoPem);
        this.nodeStore.set(nodeInfo.id, nodeInfo);
      }
    }
    // load the node aliases
    if (this.fileSystem.existsSync(this.nodeAliasMetadataPath)) {
      this.nodeAlias = JSON.parse(
        this.fileSystem.readFileSync(this.nodeAliasMetadataPath).toString(),
        JSONMapReviver,
      );
    }
  }
}

export default NodeManager;
