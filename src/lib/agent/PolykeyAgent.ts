import os from 'os';
import fs from 'fs';
import net from 'net';
import path from 'path';
import process from 'process';
import { fork, ForkOptions } from 'child_process';
import Polykey, { KeyManager } from '../Polykey';
import Configstore from 'configstore';
import PolykeyClient from './PolykeyClient';
import { agent } from '../../../proto/js/Agent';
import { Duplex } from 'readable-stream';
const {
  AgentMessage,
  CreateSecretRequestMessage,
  CreateSecretResponseMessage,
  DeriveKeyRequestMessage,
  DeriveKeyResponseMessage,
  DestroySecretRequestMessage,
  DestroySecretResponseMessage,
  DestroyVaultRequestMessage,
  DestroyVaultResponseMessage,
  ErrorMessage,
  GetSecretRequestMessage,
  GetSecretResponseMessage,
  ListNodesRequestMessage,
  ListNodesResponseMessage,
  ListSecretsRequestMessage,
  ListSecretsResponseMessage,
  ListVaultsRequestMessage,
  ListVaultsResponseMessage,
  NewNodeRequestMessage,
  NewNodeResponseMessage,
  NewVaultRequestMessage,
  NewVaultResponseMessage,
  RegisterNodeRequestMessage,
  RegisterNodeResponseMessage,
  SignFileRequestMessage,
  SignFileResponseMessage,
  Type,
  VerifyFileRequestMessage,
  VerifyFileResponseMessage,
} = agent;

class PolykeyAgent {
  private socketPath: string;
  private server: net.Server;
  private persistentStore: Configstore = new Configstore('polykey');

  // For storing the state of each polykey node
  // Keys are the paths to the polykey node, e.g. '~/.polykey'
  private polykeyMap: Map<string, Polykey> = new Map();

  public get AllNodePaths(): string[] {
    return Array.from(this.polykeyMap.keys()).filter((nodePath) => {
      try {
        this.getPolykey(nodePath);
        return true;
      } catch {
        return false;
      }
    });
  }

  public get UnlockedNodePaths(): string[] {
    return this.AllNodePaths.filter((nodePath) => {
      try {
        return this.getPolykey(nodePath).keyManager.identityLoaded;
      } catch {
        return false;
      }
    });
  }

  constructor() {
    this.socketPath = PolykeyAgent.SocketPath;

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
          this.polykeyMap.set(path, new Polykey(path, fs));
        } else {
          this.removeFromNodePaths(path);
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
  }

  private addToNodePaths(nodePath: string, pk: Polykey) {
    this.polykeyMap.set(nodePath, pk);
    const nodePathSet = new Set(this.persistentStore.get('nodePaths'));
    nodePathSet.add(nodePath);
    this.persistentStore.set('nodePaths', Array.from(nodePathSet.values()));
  }

  private removeFromNodePaths(nodePath: string) {
    this.polykeyMap.delete(nodePath);
    const nodePathSet = new Set(this.persistentStore.get('nodePaths'));
    nodePathSet.delete(nodePath);
    this.persistentStore.set('nodePaths', Array.from(nodePathSet.values()));
  }

  private handleClientCommunication(socket: net.Socket) {
    socket.on('data', async (encodedMessage: Uint8Array) => {
      try {
        const { type, nodePath, subMessage } = AgentMessage.decode(encodedMessage);
        let response: Uint8Array | undefined = undefined;
        switch (type) {
          case Type.STATUS:
            response = Buffer.from('online');
            break;
          case Type.STOP_AGENT:
            this.stop();
            process.exit();
          // eslint-disable-next-line
          case Type.REGISTER_NODE:
            response = await this.registerNode(nodePath, subMessage);
            break;
          case Type.NEW_NODE:
            response = await this.newNode(nodePath, subMessage);
            break;
          case Type.LIST_NODES:
            response = this.listNodes(subMessage);
            break;
          case Type.DERIVE_KEY:
            response = await this.deriveKey(nodePath, subMessage);
            break;
          case Type.SIGN_FILE:
            response = await this.signFile(nodePath, subMessage);
            break;
          case Type.VERIFY_FILE:
            response = await this.verifyFile(nodePath, subMessage);
            break;
          case Type.LIST_VAULTS:
            response = await this.listVaults(nodePath);
            break;
          case Type.NEW_VAULT:
            response = await this.newVault(nodePath, subMessage);
            break;
          case Type.DESTROY_VAULT:
            response = await this.destroyVault(nodePath, subMessage);
            break;
          case Type.LIST_SECRETS:
            response = await this.listSecrets(nodePath, subMessage);
            break;
          case Type.CREATE_SECRET:
            response = await this.createSecret(nodePath, subMessage);
            break;
          case Type.DESTROY_SECRET:
            response = await this.destroySecret(nodePath, subMessage);
            break;
          case Type.GET_SECRET:
            response = await this.getSecret(nodePath, subMessage);
            break;
          default:
            throw Error(`message type not supported: ${type}`);
        }

        if (response) {
          const encodedResponse = AgentMessage.encode({
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
        const errorResponse = AgentMessage.encode({
          type: Type.ERROR,
          isResponse: true,
          nodePath: undefined,
          subMessage: ErrorMessage.encode({ error: (<Error>err).message ?? err }).finish(),
        }).finish();
        socket.write(errorResponse);
      }

      // Close connection
      socket.end();
    });
  }

  // Register an existing polykey agent
  private async registerNode(nodePath: string, request: Uint8Array) {
    const { passphrase } = RegisterNodeRequestMessage.decode(request);

    let pk: Polykey | undefined = this.polykeyMap.get(nodePath);
    if (pk) {
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
    pk.keyManager.loadMetadata()
    pk.peerManager.loadMetadata()
    await pk.vaultManager.loadMetadata()
    console.log(pk.vaultManager.listVaults());


    // Set polykey class
    this.addToNodePaths(nodePath, pk);

    // Encode and send response
    const response = NewNodeResponseMessage.encode({
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

    const { name, email, passphrase, nbits } = NewNodeRequestMessage.decode(request);

    const km = new KeyManager(nodePath, fs);

    await km.generateKeyPair(name, email, passphrase, nbits == 0 ? undefined : nbits, true, (info) => {
      // socket.write(JSON.stringify(info))
    });

    // Create and set polykey class
    const pk = new Polykey(nodePath, fs, km);
    this.addToNodePaths(nodePath, pk);

    // Encode and send response
    const response = NewNodeResponseMessage.encode({
      successful: km.identityLoaded && this.polykeyMap.has(nodePath),
    }).finish();
    return response;
  }

  // Create a new polykey agent
  private listNodes(request: Uint8Array) {
    const { unlockedOnly } = ListNodesRequestMessage.decode(request);
    if (unlockedOnly) {
      return ListNodesResponseMessage.encode({ nodes: this.UnlockedNodePaths }).finish();
    } else {
      return ListNodesResponseMessage.encode({ nodes: this.AllNodePaths }).finish();
    }
  }

  private getPolykey(nodePath: string) {
    if (this.polykeyMap.has(nodePath)) {
      return this.polykeyMap.get(nodePath)!;
    } else if (fs.existsSync(nodePath)) {
      throw Error(`polykey node has not been loaded yet: '${nodePath}'`);
    } else {
      const nodePathList = new Set<string>(this.persistentStore.get('nodePaths') ?? []);
      nodePathList.delete(nodePath);
      this.persistentStore.set('nodePaths', Array.from(nodePathList.values()));
      throw Error(`node path does not exist: '${nodePath}'`);
    }
  }
  /////////////////////////
  // KeyManager commands //
  /////////////////////////
  private async deriveKey(nodePath: string, request: Uint8Array) {
    const { keyName, passphrase } = DeriveKeyRequestMessage.decode(request);
    const pk = this.getPolykey(nodePath);
    await pk.keyManager.generateKey(keyName, passphrase);
    return DeriveKeyResponseMessage.encode({ successful: true }).finish();
  }

  /////////////////////
  // Crypto commands //
  /////////////////////
  private async signFile(nodePath: string, request: Uint8Array) {
    const { filePath, privateKeyPath, passphrase } = SignFileRequestMessage.decode(request);
    const pk = this.getPolykey(nodePath);
    const signaturePath = await pk.keyManager.signFile(filePath, privateKeyPath, passphrase);
    return SignFileResponseMessage.encode({ signaturePath }).finish();
  }
  private async verifyFile(nodePath: string, request: Uint8Array) {
    const { filePath, signaturePath } = VerifyFileRequestMessage.decode(request);
    const pk = this.getPolykey(nodePath);
    const verified = await pk.keyManager.verifyFile(filePath, signaturePath);
    return VerifyFileResponseMessage.encode({ verified }).finish();
  }

  //////////////////////
  // Vault Operations //
  //////////////////////
  private async listVaults(nodePath: string) {
    const pk = this.getPolykey(nodePath);
    const vaultNames = pk.vaultManager.listVaults();
    return ListVaultsResponseMessage.encode({ vaultNames }).finish();
  }
  private async newVault(nodePath: string, request: Uint8Array) {
    const { vaultName } = NewVaultRequestMessage.decode(request);
    const pk = this.getPolykey(nodePath);
    await pk.vaultManager.createVault(vaultName);
    return NewVaultResponseMessage.encode({ successful: true }).finish();
  }
  private async destroyVault(nodePath: string, request: Uint8Array) {
    const { vaultName } = DestroyVaultRequestMessage.decode(request);
    const pk = this.getPolykey(nodePath);
    pk.vaultManager.destroyVault(vaultName);
    return DestroyVaultResponseMessage.encode({ successful: true }).finish();
  }

  ///////////////////////
  // Secret Operations //
  ///////////////////////
  private async listSecrets(nodePath: string, request: Uint8Array) {
    const { vaultName } = ListSecretsRequestMessage.decode(request);
    const pk = this.getPolykey(nodePath);
    const vault = pk.vaultManager.getVault(vaultName);
    const secretNames = vault.listSecrets();
    return ListSecretsResponseMessage.encode({ secretNames }).finish();
  }
  private async createSecret(nodePath: string, request: Uint8Array) {
    const { vaultName, secretName, secretPath, secretContent } = CreateSecretRequestMessage.decode(request);
    const pk = this.getPolykey(nodePath);
    const vault = pk.vaultManager.getVault(vaultName);
    let secretBuffer: Buffer
    if (secretPath) {
      secretBuffer = await fs.promises.readFile(secretPath);
    } else {
      secretBuffer = Buffer.from(secretContent)
    }
    await vault.addSecret(secretName, secretBuffer);
    return CreateSecretResponseMessage.encode({ successful: true }).finish();
  }
  private async destroySecret(nodePath: string, request: Uint8Array) {
    const { vaultName, secretName } = DestroySecretRequestMessage.decode(request);
    const pk = this.getPolykey(nodePath);
    const vault = pk.vaultManager.getVault(vaultName);
    await vault.removeSecret(secretName);
    return DestroySecretResponseMessage.encode({ successful: true }).finish();
  }
  private async getSecret(nodePath: string, request: Uint8Array) {
    const { vaultName, secretName } = GetSecretRequestMessage.decode(request);
    const pk = this.getPolykey(nodePath);
    const vault = pk.vaultManager.getVault(vaultName);
    const secret = Buffer.from(vault.getSecret(secretName));
    return GetSecretResponseMessage.encode({ secret: secret }).finish();
  }

  ///////////////////////
  // Client Connection //
  ///////////////////////
  static connectToAgent(getStream?: () => Duplex): PolykeyClient {
    const defaultStream = () => {
      const socket = <Duplex>(<any>net.createConnection(PolykeyAgent.SocketPath));
      return socket;
    };

    const client = new PolykeyClient(getStream ?? defaultStream);

    return client;
  }

  // ===== Helper methods===== //
  static get SocketPath(): string {
    const platform = os.platform();
    const userInfo = os.userInfo();
    if (platform == 'win32') {
      return path.join('\\\\?\\pipe', process.cwd(), 'polykey-agent');
    } else {
      return `/run/user/${userInfo.uid}/polykey/S.polykey-agent`;
    }
  }

  public static get LogPath(): string {
    const platform = os.platform();
    const userInfo = os.userInfo();
    if (platform == 'win32') {
      return path.join(os.tmpdir(), 'polykey', 'log');
    } else {
      return `/run/user/${userInfo.uid}/polykey/log`;
    }
  }

  //////////////////////
  // Agent Operations //
  //////////////////////
  static DAEMON_SCRIPT_PATH = path.join(__dirname, 'internal', 'daemon-script.js');

  public static async startAgent(daemon: boolean = false) {
    return new Promise<number>((resolve, reject) => {
      try {
        fs.rmdirSync(PolykeyAgent.LogPath, { recursive: true });
        fs.mkdirSync(PolykeyAgent.LogPath, { recursive: true });

        let options: ForkOptions = {
          uid: process.getuid(),
          detached: daemon,
          stdio: [
            'ipc',
            fs.openSync(path.join(PolykeyAgent.LogPath, 'output.log'), 'a'),
            fs.openSync(path.join(PolykeyAgent.LogPath, 'error.log'), 'a'),
          ]
        };
        const agentProcess = fork(PolykeyAgent.DAEMON_SCRIPT_PATH, undefined, options);

        const pid = agentProcess.pid;
        agentProcess.unref();
        resolve(pid);
      } catch (err) {
        reject(err);
      }
    });
  }
}

export default PolykeyAgent;
