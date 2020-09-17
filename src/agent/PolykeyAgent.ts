import os from 'os';
import fs from 'fs';
import net from 'net';
import path from 'path';
import process from 'process';
import Configstore from 'configstore';
import PeerInfo from '../peers/PeerInfo';
import { Duplex } from 'readable-stream';
import PolykeyClient from './PolykeyClient';
import Polykey, { KeyManager } from '../Polykey';
import { spawn, SpawnOptions } from 'child_process';
import { agentInterface } from '../../proto/js/Agent';

class PolykeyAgent {
  private socketPath: string;
  private server: net.Server;
  private persistentStore: Configstore;

  // For storing the state of each polykey node
  // Keys are the paths to the polykey node, e.g. '~/.polykey'
  private polykeyMap: Map<string, Polykey> = new Map();
  private pid: number;
  private setPolyKey(nodePath: string, pk: Polykey) {
    this.polykeyMap.set(nodePath, pk);
    const nodePathSet = new Set(this.persistentStore.get('nodePaths'));
    nodePathSet.add(nodePath);
    this.persistentStore.set('nodePaths', Array.from(nodePathSet.values()));
  }

  private removeNodePath(nodePath: string) {
    this.polykeyMap.delete(nodePath);
    const nodePathSet = new Set(this.persistentStore.get('nodePaths'));
    nodePathSet.delete(nodePath);
    this.persistentStore.set('nodePaths', Array.from(nodePathSet.values()));
  }

  private getPolyKey(nodePath: string, failOnLocked: boolean = true): Polykey {
    const pk = this.polykeyMap.get(nodePath);
    if (this.polykeyMap.has(nodePath) && pk) {
      if (fs.existsSync(nodePath)) {
        if (failOnLocked && !pk.keyManager.identityLoaded) {
          throw Error(`node path exists in memory but is locked: ${nodePath}`);
        } else {
          return pk;
        }
      } else {
        this.removeNodePath(nodePath);
        throw Error(`node path exists in memory but does not exist on file system: ${nodePath}`);
      }
    } else {
      this.removeNodePath(nodePath);
      throw Error(`node path does not exist in memory: ${nodePath}`);
    }
  }

  public get AllNodePaths(): string[] {
    return Array.from(this.polykeyMap.keys()).filter((nodePath) => {
      try {
        this.getPolyKey(nodePath, false);
        return true;
      } catch {
        return false;
      }
    });
  }

  public get UnlockedNodePaths(): string[] {
    return this.AllNodePaths.filter((nodePath) => {
      try {
        return this.getPolyKey(nodePath, false).keyManager.identityLoaded;
      } catch {
        return false;
      }
    });
  }

  constructor() {
    this.pid = process.pid;
    this.socketPath = PolykeyAgent.SocketPath;

    this.persistentStore = new Configstore('polykey', undefined, {
      configPath: path.join(path.dirname(this.socketPath), '.node_path_list.json'),
    });

    // Make sure the socket file doesn't already exist (agent is already running)
    if (fs.existsSync(this.socketPath)) {
      fs.unlinkSync(this.socketPath);
    }

    // Make the socket path if it doesn't exist
    if (!fs.existsSync(path.dirname(this.socketPath))) {
      fs.promises.mkdir(path.dirname(this.socketPath));
    }

    // Load polykeys
    const nodePaths: string[] | undefined = this.persistentStore.get('nodePaths');
    if (nodePaths?.values) {
      for (const path of nodePaths) {
        if (fs.existsSync(path)) {
          this.setPolyKey(path, new Polykey(path, fs));
        } else {
          this.removeNodePath(path);
        }
      }
    } else {
      this.persistentStore.set('nodePaths', []);
    }

    // Start the server
    this.server = net.createServer().listen(this.socketPath);
    this.server.on('connection', (socket) => {
      this.handleClientCommunication(socket);
    });
  }

  stop() {
    this.server.close();
    for (const nodePath of this.polykeyMap.keys()) {
      const pk = this.getPolyKey(nodePath);
      pk.peerManager.multicastBroadcaster.stopBroadcasting();
    }
    // finally kill the pid of the agent process
    if (process.env.NODE_ENV !== 'test') {
      process.kill(this.pid);
    }
  }

  private handleClientCommunication(socket: net.Socket) {
    socket.on('data', async (encodedMessage: Uint8Array) => {
      try {
        const { type, nodePath, subMessage } = agentInterface.AgentMessage.decodeDelimited(encodedMessage);
        let response: Uint8Array | undefined = undefined;
        switch (type) {
          case agentInterface.AgentMessageType.STATUS:
            response = agentInterface.AgentStatusResponseMessage.encodeDelimited({
              status: agentInterface.AgentStatusType.ONLINE,
            }).finish();
            break;
          case agentInterface.AgentMessageType.STOP_AGENT:
            this.stop();
            break;
          case agentInterface.AgentMessageType.REGISTER_NODE:
            response = await this.registerNode(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.NEW_NODE:
            response = await this.newNode(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.LIST_NODES:
            response = this.listNodes(subMessage);
            break;
          case agentInterface.AgentMessageType.DERIVE_KEY:
            response = await this.deriveKey(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.LIST_KEYS:
            response = await this.listKeys(nodePath);
            break;
          case agentInterface.AgentMessageType.GET_KEY:
            response = await this.getKey(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.GET_PRIMARY_KEYPAIR:
            response = await this.getPrimaryKeyPair(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.DELETE_KEY:
            response = await this.deleteKey(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.SIGN_FILE:
            response = await this.signFile(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.VERIFY_FILE:
            response = await this.verifyFile(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.ENCRYPT_FILE:
            response = await this.encryptFile(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.DECRYPT_FILE:
            response = await this.decryptFile(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.LIST_VAULTS:
            response = await this.listVaults(nodePath);
            break;
          case agentInterface.AgentMessageType.SCAN_VAULT_NAMES:
            response = await this.scanVaultNames(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.NEW_VAULT:
            response = await this.newVault(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.PULL_VAULT:
            response = await this.pullVault(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.DESTROY_VAULT:
            response = await this.destroyVault(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.LIST_SECRETS:
            response = await this.listSecrets(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.CREATE_SECRET:
            response = await this.createSecret(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.DESTROY_SECRET:
            response = await this.destroySecret(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.GET_SECRET:
            response = await this.getSecret(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.UPDATE_SECRET:
            response = await this.updateSecret(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.ADD_PEER:
            response = await this.addPeer(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.GET_PEER_INFO:
            response = await this.getPeerInfo(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.PING_PEER:
            response = await this.pingPeer(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.FIND_PEER:
            response = await this.findPeer(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.FIND_SOCIAL_PEER:
            response = await this.findSocialPeer(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.LIST_PEERS:
            response = await this.listPeers(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.TOGGLE_STEALTH:
            response = await this.toggleStealth(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.UPDATE_PEER_INFO:
            response = await this.updatePeerInfo(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.REQUEST_RELAY:
            response = await this.requestRelay(nodePath, subMessage);
            break;
          case agentInterface.AgentMessageType.REQUEST_PUNCH:
            response = await this.requestPunch(nodePath, subMessage);
            break;
          default:
            throw Error(`message type not supported: ${agentInterface.AgentMessageType[type]}`);
        }

        if (response) {
          const encodedResponse = agentInterface.AgentMessage.encodeDelimited({
            type: type,
            isResponse: true,
            nodePath: nodePath,
            subMessage: response,
          }).finish();
          socket.write(encodedResponse);
        } else {
          throw Error('something went wrong');
        }
      } catch (err) {
        const errorResponse = agentInterface.AgentMessage.encodeDelimited({
          type: agentInterface.AgentMessageType.ERROR,
          isResponse: true,
          nodePath: undefined,
          subMessage: agentInterface.ErrorMessage.encodeDelimited({ error: (<Error>err).message ?? err }).finish(),
        }).finish();
        socket.write(errorResponse);
      }

      // Close connection
      socket.end();
    });
  }

  // Register an existing polykey agent
  private async registerNode(nodePath: string, request: Uint8Array) {
    const { passphrase } = agentInterface.RegisterNodeRequestMessage.decodeDelimited(request);

    let pk: Polykey;
    if (this.polykeyMap.has(nodePath)) {
      pk = this.getPolyKey(nodePath, false);
      if (pk.keyManager.identityLoaded) {
        throw Error(`node path is already loaded and unlocked: '${nodePath}'`);
      }
      await pk.keyManager.unlockIdentity(passphrase);
    } else {
      const km = new KeyManager(nodePath, fs);
      await km.unlockIdentity(passphrase);
      // Create polykey class
      pk = new Polykey(nodePath, fs, km);
    }
    // Load all metadata
    await pk.keyManager.loadMetadata();
    await pk.vaultManager.loadMetadata();

    // Set polykey class
    this.setPolyKey(nodePath, pk);

    // Encode and send response
    const response = agentInterface.NewNodeResponseMessage.encodeDelimited({
      successful: pk.keyManager.identityLoaded && this.polykeyMap.has(nodePath),
    }).finish();

    return response;
  }

  // Create a new polykey agent
  private async newNode(nodePath: string, request: Uint8Array) {
    // Throw if path already exists
    if (this.polykeyMap.has(nodePath) && fs.existsSync(nodePath)) {
      throw Error(`node path '${nodePath}' is already loaded`);
    } else if (fs.existsSync(nodePath)) {
      throw Error(`node path already exists: '${nodePath}'`);
    }

    const { userId, passphrase, nbits } = agentInterface.NewNodeRequestMessage.decodeDelimited(request);

    const km = new KeyManager(nodePath, fs);

    await km.generateKeyPair(userId, passphrase, nbits == 0 ? undefined : nbits, true, (info) => {
      // socket.write(JSON.stringify(info))
    });

    // Create and set polykey class
    const pk = new Polykey(nodePath, fs, km);
    this.setPolyKey(nodePath, pk);

    // Encode and send response
    const response = agentInterface.NewNodeResponseMessage.encodeDelimited({
      successful: km.identityLoaded && this.polykeyMap.has(nodePath),
    }).finish();
    return response;
  }

  // Create a new polykey agent
  private listNodes(request: Uint8Array) {
    const { unlockedOnly } = agentInterface.ListNodesRequestMessage.decodeDelimited(request);
    if (unlockedOnly) {
      return agentInterface.ListNodesResponseMessage.encodeDelimited({ nodes: this.UnlockedNodePaths }).finish();
    } else {
      return agentInterface.ListNodesResponseMessage.encodeDelimited({ nodes: this.AllNodePaths }).finish();
    }
  }

  /////////////////////////
  // KeyManager commands //
  /////////////////////////
  private async deriveKey(nodePath: string, request: Uint8Array) {
    const { keyName, passphrase } = agentInterface.DeriveKeyRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    await pk.keyManager.generateKey(keyName, passphrase);
    return agentInterface.DeriveKeyResponseMessage.encodeDelimited({ successful: true }).finish();
  }

  private async listKeys(nodePath: string) {
    const pk = this.getPolyKey(nodePath);
    const keyNames = pk.keyManager.listKeys();
    return agentInterface.ListKeysResponseMessage.encodeDelimited({ keyNames }).finish();
  }

  private async getKey(nodePath: string, request: Uint8Array) {
    const { keyName } = agentInterface.GetKeyRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    const keyContent = pk.keyManager.getKey(keyName).toString();
    return agentInterface.GetKeyResponseMessage.encodeDelimited({ keyContent }).finish();
  }

  private async getPrimaryKeyPair(nodePath: string, request: Uint8Array) {
    const { includePrivateKey } = agentInterface.GetPrimaryKeyPairRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    const keypair = pk.keyManager.getKeyPair();
    return agentInterface.GetPrimaryKeyPairResponseMessage.encodeDelimited({
      publicKey: keypair.public,
      privateKey: includePrivateKey ? keypair.private : undefined,
    }).finish();
  }

  private async deleteKey(nodePath: string, request: Uint8Array) {
    const { keyName } = agentInterface.DeleteKeyRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    const successful = await pk.keyManager.deleteKey(keyName);
    return agentInterface.DeleteKeyResponseMessage.encodeDelimited({ successful }).finish();
  }

  /////////////////////
  // Crypto commands //
  /////////////////////
  private async signFile(nodePath: string, request: Uint8Array) {
    const { filePath, privateKeyPath, passphrase } = agentInterface.SignFileRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    const signaturePath = await pk.keyManager.signFile(filePath, privateKeyPath, passphrase);
    return agentInterface.SignFileResponseMessage.encodeDelimited({ signaturePath }).finish();
  }

  private async verifyFile(nodePath: string, request: Uint8Array) {
    const { filePath, publicKeyPath } = agentInterface.VerifyFileRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    const verified = await pk.keyManager.verifyFile(filePath, publicKeyPath);
    return agentInterface.VerifyFileResponseMessage.encodeDelimited({ verified }).finish();
  }

  private async encryptFile(nodePath: string, request: Uint8Array) {
    const { filePath, publicKeyPath } = agentInterface.EncryptFileRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    const encryptedPath = await pk.keyManager.encryptFile(filePath, publicKeyPath);
    return agentInterface.EncryptFileResponseMessage.encodeDelimited({ encryptedPath }).finish();
  }

  private async decryptFile(nodePath: string, request: Uint8Array) {
    const { filePath, privateKeyPath, passphrase } = agentInterface.DecryptFileRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    const decryptedPath = await pk.keyManager.decryptFile(filePath, privateKeyPath, passphrase);
    return agentInterface.DecryptFileResponseMessage.encodeDelimited({ decryptedPath }).finish();
  }

  //////////////////////
  // Vault Operations //
  //////////////////////
  private async listVaults(nodePath: string) {
    const pk = this.getPolyKey(nodePath);
    const vaultNames = pk.vaultManager.listVaults();
    return agentInterface.ListVaultsResponseMessage.encodeDelimited({ vaultNames }).finish();
  }

  private async scanVaultNames(nodePath: string, request: Uint8Array) {
    const { publicKey } = agentInterface.ScanVaultNamesRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    const vaultNames = await pk.vaultManager.scanVaultNames(publicKey);
    return agentInterface.ScanVaultNamesResponseMessage.encodeDelimited({ vaultNames }).finish();
  }

  private async newVault(nodePath: string, request: Uint8Array) {
    const { vaultName } = agentInterface.NewVaultRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    await pk.vaultManager.createVault(vaultName);
    return agentInterface.NewVaultResponseMessage.encodeDelimited({ successful: true }).finish();
  }

  private async pullVault(nodePath: string, request: Uint8Array) {
    const { vaultName, publicKey } = agentInterface.PullVaultRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    // pull if vault exists locally, otherwise clone
    if (pk.vaultManager.vaultExists(vaultName)) {
      const vault = pk.vaultManager.getVault(vaultName);
      vault.pullVault(publicKey);
    } else {
      pk.vaultManager.cloneVault(vaultName, publicKey);
    }
    return agentInterface.PullVaultResponseMessage.encodeDelimited({ successful: true }).finish();
  }

  private async destroyVault(nodePath: string, request: Uint8Array) {
    const { vaultName } = agentInterface.DestroyVaultRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    pk.vaultManager.destroyVault(vaultName);
    return agentInterface.DestroyVaultResponseMessage.encodeDelimited({ successful: true }).finish();
  }

  ///////////////////////
  // Secret Operations //
  ///////////////////////
  private async listSecrets(nodePath: string, request: Uint8Array) {
    const { vaultName } = agentInterface.ListSecretsRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    const vault = pk.vaultManager.getVault(vaultName);
    const secretNames = vault.listSecrets();
    return agentInterface.ListSecretsResponseMessage.encodeDelimited({ secretNames }).finish();
  }

  private async createSecret(nodePath: string, request: Uint8Array) {
    const {
      vaultName,
      secretName,
      secretPath,
      secretContent,
    } = agentInterface.CreateSecretRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    const vault = pk.vaultManager.getVault(vaultName);
    let secretBuffer: Buffer;
    if (secretPath) {
      secretBuffer = await fs.promises.readFile(secretPath);
    } else {
      secretBuffer = Buffer.from(secretContent);
    }
    await vault.addSecret(secretName, secretBuffer);
    return agentInterface.CreateSecretResponseMessage.encodeDelimited({ successful: true }).finish();
  }

  private async destroySecret(nodePath: string, request: Uint8Array) {
    const { vaultName, secretName } = agentInterface.DestroySecretRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    const vault = pk.vaultManager.getVault(vaultName);
    await vault.removeSecret(secretName);
    return agentInterface.DestroySecretResponseMessage.encodeDelimited({ successful: true }).finish();
  }

  private async getSecret(nodePath: string, request: Uint8Array) {
    const { vaultName, secretName } = agentInterface.GetSecretRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    const vault = pk.vaultManager.getVault(vaultName);
    const secret = Buffer.from(vault.getSecret(secretName));
    return agentInterface.GetSecretResponseMessage.encodeDelimited({ secret: secret }).finish();
  }

  private async updateSecret(nodePath: string, request: Uint8Array) {
    const {
      vaultName,
      secretName,
      secretPath,
      secretContent,
    } = agentInterface.UpdateSecretRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    const vault = pk.vaultManager.getVault(vaultName);
    let secretBuffer: Buffer;
    if (secretPath) {
      secretBuffer = await fs.promises.readFile(secretPath);
    } else {
      secretBuffer = Buffer.from(secretContent);
    }
    await vault.updateSecret(secretName, secretBuffer);
    return agentInterface.UpdateSecretResponseMessage.encodeDelimited({ successful: true }).finish();
  }

  /////////////////////
  // Peer Operations //
  /////////////////////
  private async addPeer(nodePath: string, request: Uint8Array) {
    const { publicKey, peerAddress, relayPublicKey } = agentInterface.AddPeerRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    pk.peerManager.addPeer(new PeerInfo(publicKey, peerAddress, relayPublicKey));
    return agentInterface.AddPeerResponseMessage.encodeDelimited({ successful: true }).finish();
  }

  private async getPeerInfo(nodePath: string, request: Uint8Array) {
    const { current, publicKey } = agentInterface.PeerInfoRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    let peerInfo: PeerInfo;
    if (current) {
      peerInfo = pk.peerManager.peerInfo;
    } else {
      if (!pk.peerManager.hasPeer(publicKey)) {
        throw Error('public key does not exist in peer store');
      }
      peerInfo = pk.peerManager.getPeer(publicKey)!;
    }
    return agentInterface.PeerInfoResponseMessage.encodeDelimited({
      publicKey: peerInfo.publicKey,
      peerAddress: peerInfo.peerAddress?.toString(),
      relayPublicKey: peerInfo.relayPublicKey,
    }).finish();
  }

  private async pingPeer(nodePath: string, request: Uint8Array) {
    const { publicKey, timeout } = agentInterface.PingPeerRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    const successful = await pk.peerManager.pingPeer(publicKey, timeout);
    return agentInterface.PingPeerResponseMessage.encodeDelimited({ successful }).finish();
  }

  private async findPeer(nodePath: string, request: Uint8Array) {
    const { publicKey, timeout } = agentInterface.FindPeerRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    const successful = await pk.peerManager.findPublicKey(publicKey, timeout);
    return agentInterface.FindPeerResponseMessage.encodeDelimited({ successful }).finish();
  }

  private async findSocialPeer(nodePath: string, request: Uint8Array) {
    const { handle, service, timeout } = agentInterface.FindSocialPeerRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    const successful = await pk.peerManager.findSocialUser(handle, service, timeout);
    return agentInterface.FindSocialPeerResponseMessage.encodeDelimited({ successful }).finish();
  }

  private async listPeers(nodePath: string, request: Uint8Array) {
    const pk = this.getPolyKey(nodePath);
    const publicKeys = pk.peerManager.listPeers();
    return agentInterface.ListPeersResponseMessage.encodeDelimited({ publicKeys }).finish();
  }

  private async toggleStealth(nodePath: string, request: Uint8Array) {
    const { active } = agentInterface.ToggleStealthRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    pk.peerManager.toggleStealthMode(active);
    return agentInterface.ToggleStealthResponseMessage.encodeDelimited({ successful: true }).finish();
  }

  private async updatePeerInfo(nodePath: string, request: Uint8Array) {
    const {
      publicKey,
      currentNode,
      peerHost,
      peerPort,
      relayPublicKey,
    } = agentInterface.UpdatePeerInfoRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);

    let currentPeerInfo: PeerInfo;
    if (currentNode) {
      currentPeerInfo = pk.peerManager.peerInfo;
    } else {
      if (!pk.peerManager.hasPeer(publicKey)) {
        throw Error('peer does not exist in store');
      }
      currentPeerInfo = pk.peerManager.getPeer(publicKey)!;
    }
    currentPeerInfo.peerAddress?.updateHost(peerHost);
    currentPeerInfo.peerAddress?.updatePort(peerPort);
    currentPeerInfo.relayPublicKey = relayPublicKey;

    if (!currentNode) {
      pk.peerManager.updatePeer(currentPeerInfo);
    }

    return agentInterface.UpdatePeerInfoResponseMessage.encodeDelimited({ successful: true }).finish();
  }

  private async requestRelay(nodePath: string, request: Uint8Array) {
    const { publicKey } = agentInterface.RequestRelayRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    await pk.peerManager.turnClient.requestRelayConnection(publicKey);
    return agentInterface.RequestRelayResponseMessage.encodeDelimited({ successful: true }).finish();
  }

  private async requestPunch(nodePath: string, request: Uint8Array) {
    const { publicKey } = agentInterface.RequestPunchRequestMessage.decodeDelimited(request);
    const pk = this.getPolyKey(nodePath);
    const address = await pk.peerManager.turnClient.requestLocalHolePunchAddress(publicKey);
    return agentInterface.RequestPunchResponseMessage.encodeDelimited({ address: address.toString() }).finish();
  }

  ///////////////////////
  // Client Connection //
  ///////////////////////
  static connectToAgent(getStream?: () => Duplex): PolykeyClient {
    const defaultStream = () => {
      const socket = net.createConnection(PolykeyAgent.SocketPath);
      return <Duplex>(<any>socket);
    };

    const client = new PolykeyClient(getStream ?? defaultStream);

    return client;
  }

  // ===== Helper methods===== //
  static get SocketPath(): string {
    const platform = os.platform();
    const userInfo = os.userInfo();
    if (process.env.PK_SOCKET_PATH) {
      return process.env.PK_SOCKET_PATH;
    } else if (platform == 'win32') {
      return path.join('\\\\?\\pipe', process.cwd(), 'polykey-agent');
    } else {
      return `/run/user/${userInfo.uid}/polykey/S.polykey-agent`;
    }
  }

  public static get LogPath(): string {
    const platform = os.platform();
    const userInfo = os.userInfo();
    if (process.env.PK_LOG_PATH) {
      return process.env.PK_LOG_PATH;
    } else if (platform == 'win32') {
      return path.join(os.tmpdir(), 'polykey', 'log');
    } else {
      return `/run/user/${userInfo.uid}/polykey/log`;
    }
  }

  //////////////////////
  // Agent Operations //
  //////////////////////
  private static DAEMON_SCRIPT_PATH_PREFIX = path.resolve(__dirname, 'internal', 'daemon-script.');
  private static DAEMON_SCRIPT_PATH_SUFFIX = fs.existsSync(PolykeyAgent.DAEMON_SCRIPT_PATH_PREFIX + 'js') ? 'js' : 'ts';
  static DAEMON_SCRIPT_PATH = PolykeyAgent.DAEMON_SCRIPT_PATH_PREFIX + PolykeyAgent.DAEMON_SCRIPT_PATH_SUFFIX;

  public static async startAgent(daemon: boolean = false) {
    return new Promise<number>((resolve, reject) => {
      try {
        if (fs.existsSync(PolykeyAgent.LogPath)) {
          fs.rmdirSync(PolykeyAgent.LogPath, { recursive: true });
        }
        fs.mkdirSync(PolykeyAgent.LogPath, { recursive: true });

        let options: SpawnOptions = {
          uid: process.getuid(),
          detached: daemon,
          stdio: [
            'ipc',
            fs.openSync(path.join(PolykeyAgent.LogPath, 'output.log'), 'a'),
            fs.openSync(path.join(PolykeyAgent.LogPath, 'error.log'), 'a'),
          ],
        };

        const agentProcess = spawn(
          PolykeyAgent.DAEMON_SCRIPT_PATH.includes('.js') ? 'node' : 'ts-node',
          [PolykeyAgent.DAEMON_SCRIPT_PATH],
          options,
        );

        const pid = agentProcess.pid;
        agentProcess.unref();
        agentProcess.disconnect();
        resolve(pid);
      } catch (err) {
        reject(err);
      }
    });
  }
}

export default PolykeyAgent;
