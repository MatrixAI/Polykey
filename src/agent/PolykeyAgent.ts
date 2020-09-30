import fs from 'fs';
import path from 'path';
import process from 'process';
import { promisify } from 'util';
import { getPort } from '../utils';
import ConfigStore from 'configstore';
import * as grpc from '@grpc/grpc-js';
import { spawn, SpawnOptions } from 'child_process';
import * as agent from '../../proto/compiled/Agent_pb';
import Polykey, { PeerInfo, Address, KeyManager } from '../Polykey';
import { AgentService, IAgentServer, AgentClient } from '../../proto/compiled/Agent_grpc_pb';

type CAStore = {
  rootCert: string;
  clientCert: string;
  clientKeyPair: {
    private: string;
    public: string;
  };
};

class PolykeyAgent implements IAgentServer {
  private pid: number;
  private pk: Polykey;
  private configStore: ConfigStore;

  private server: grpc.Server;

  constructor(polykeyPath: string) {
    /////////////
    // Polykey //
    /////////////
    // construct polykey instance if already initialized
    this.pk = new Polykey(polykeyPath, fs);

    //////////////////
    // Config Store //
    //////////////////
    this.configStore = PolykeyAgent.ConfigStore(this.pk.polykeyPath);

    /////////////
    // Process //
    /////////////
    process.title = 'polykey-agent';
    // set pid for stopAgent command
    this.pid = process.pid;
    this.configStore.set('pid', this.pid);

    /////////////////
    // GRPC Server //
    /////////////////
    this.server = new grpc.Server();
    this.server.addService(AgentService, <grpc.UntypedServiceImplementation>(<any>this));
  }

  private failOnLocked() {
    if (!this.pk.keyManager.identityLoaded) {
      throw Error(`polykey is locked at ${this.pk.polykeyPath}`);
    }
  }

  private static CAStore(polykeyPath: string): ConfigStore {
    return new ConfigStore('ca', undefined, {
      configPath: path.join(polykeyPath, '.agent', 'caStoreConfig.json'),
    });
  }

  private get ServerCredentials() {
    const caStoreConfig = PolykeyAgent.CAStore(this.pk.polykeyPath);
    // The agent stores its root certificate and the client cert and keypair
    // in a user specific folder.
    // check if credentials exist for current polykey path
    let caStore: CAStore;
    if (caStoreConfig.has(this.pk.polykeyPath)) {
      caStore = caStoreConfig.get(this.pk.polykeyPath)!;
    } else {
      const clientCreds = this.pk.keyManager.pki.createAgentClientCredentials();
      caStore = {
        rootCert: this.pk.keyManager.pki.RootCert,
        ...clientCreds,
      };
      caStoreConfig.set(this.pk.polykeyPath, caStore);
    }

    ////////////////////////
    // Server credentials //
    ////////////////////////
    const tlsCredentials = this.pk.keyManager.pki.createAgentServerCredentials();
    if (tlsCredentials) {
      return grpc.ServerCredentials.createSsl(
        Buffer.from(this.pk.keyManager.pki.RootCert),
        [
          {
            private_key: Buffer.from(tlsCredentials.serverKeyPair.private),
            cert_chain: Buffer.from(tlsCredentials.serverCert),
          },
        ],
        true,
      );
    } else {
      return grpc.ServerCredentials.createInsecure();
    }
  }

  async startServer() {
    // first try and stop server if its still running
    // don't need to catch errors
    try {
      await promisify(this.server.tryShutdown)();
    } catch (error) { }

    // handle port
    const portString = this.configStore.get('port');
    const port = await getPort(parseInt(portString));

    // bind server to port and start
    const boundPort = await new Promise<number>((resolve, reject) => {
      this.server.bindAsync(`localhost:${port}`, this.ServerCredentials, (error, boundPort) => {
        if (error) {
          reject(error);
        } else {
          resolve(boundPort);
        }
      });
    });
    this.server.start();
    this.configStore.set('port', boundPort);
    console.log(`Agent started on: 'localhost:${boundPort}'`);
  }

  async addPeer(
    call: grpc.ServerUnaryCall<agent.PeerInfoMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      this.failOnLocked();
      const { publicKey, peerAddress, relayPublicKey, apiAddress } = call.request!.toObject();
      this.pk.peerManager.addPeer(new PeerInfo(publicKey, peerAddress, relayPublicKey, apiAddress));
      const response = new agent.BooleanMessage();
      response.setB(true);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async decryptFile(
    call: grpc.ServerUnaryCall<agent.DecryptFileMessage, agent.StringMessage>,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    try {
      this.failOnLocked();
      const { filePath, privateKeyPath, passphrase } = call.request!.toObject();
      const decryptedPath = await this.pk.keyManager.decryptFile(filePath, privateKeyPath, passphrase);
      const response = new agent.StringMessage();
      response.setS(decryptedPath);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async deleteKey(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      const successful = await this.pk.keyManager.deleteKey(s);
      const response = new agent.BooleanMessage();
      response.setB(successful);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async deleteSecret(
    call: grpc.ServerUnaryCall<agent.SecretPathMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      this.failOnLocked();
      const { vaultName, secretName } = call.request!.toObject();
      const vault = this.pk.vaultManager.getVault(vaultName);
      await vault.removeSecret(secretName);
      const response = new agent.BooleanMessage();
      response.setB(true);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async deleteVault(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      await this.pk.vaultManager.deleteVault(s);
      const response = new agent.BooleanMessage();
      response.setB(true);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async deriveKey(
    call: grpc.ServerUnaryCall<agent.DeriveKeyMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      this.failOnLocked();
      const { keyName, passphrase } = call.request!.toObject();
      await this.pk.keyManager.generateKey(keyName, passphrase);
      const response = new agent.BooleanMessage();
      response.setB(true);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async encryptFile(
    call: grpc.ServerUnaryCall<agent.EncryptFileMessage, agent.StringMessage>,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    try {
      this.failOnLocked();
      const { filePath, publicKeyPath } = call.request!.toObject();
      const encryptedPath = await this.pk.keyManager.encryptFile(filePath, publicKeyPath);
      const response = new agent.StringMessage();
      response.setS(encryptedPath);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async findPeer(
    call: grpc.ServerUnaryCall<agent.ContactPeerMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      this.failOnLocked();
      const { publicKeyOrHandle, timeout } = call.request!.toObject();
      const successful = await this.pk.peerManager.findPublicKey(publicKeyOrHandle, timeout);
      const response = new agent.BooleanMessage();
      response.setB(successful);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async findSocialPeer(
    call: grpc.ServerUnaryCall<agent.ContactPeerMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      this.failOnLocked();
      const { publicKeyOrHandle, timeout } = call.request!.toObject();
      // eslint-disable-next-line
      const usernameRegex = /^\@([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/;
      const matches = publicKeyOrHandle.match(usernameRegex)!;
      const service = matches[1]!;
      const handle = matches[2]!;
      const successful = await this.pk.peerManager.findSocialUser(handle, service, timeout);
      const response = new agent.BooleanMessage();
      response.setB(successful);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getKey(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.StringMessage>,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      const keyContent = this.pk.keyManager.getKey(s).toString();
      const response = new agent.StringMessage();
      response.setS(keyContent);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getLocalPeerInfo(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.PeerInfoMessage>,
    callback: grpc.sendUnaryData<agent.PeerInfoMessage>,
  ) {
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      const peerInfo = this.pk.peerManager.peerInfo;
      const response = new agent.PeerInfoMessage();
      response.setPublicKey(peerInfo.publicKey);
      if (peerInfo.relayPublicKey) {
        response.setRelayPublicKey(peerInfo.relayPublicKey);
      }
      if (peerInfo.peerAddress) {
        response.setPeerAddress(peerInfo.peerAddress?.toString());
      }
      if (peerInfo.apiAddress) {
        response.setApiAddress(peerInfo.apiAddress?.toString());
      }
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getPeerInfo(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.PeerInfoMessage>,
    callback: grpc.sendUnaryData<agent.PeerInfoMessage>,
  ) {
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      if (!this.pk.peerManager.hasPeer(s)) {
        throw Error('public key does not exist in peer store');
      }
      const peerInfo = this.pk.peerManager.getPeer(s)!;
      const response = new agent.PeerInfoMessage();
      response.setPublicKey(peerInfo.publicKey);
      if (peerInfo.relayPublicKey) {
        response.setRelayPublicKey(peerInfo.relayPublicKey);
      }
      if (peerInfo.peerAddress) {
        response.setPeerAddress(peerInfo.peerAddress?.toString());
      }
      if (peerInfo.apiAddress) {
        response.setApiAddress(peerInfo.apiAddress?.toString());
      }
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getPrimaryKeyPair(
    call: grpc.ServerUnaryCall<agent.BooleanMessage, agent.KeyPairMessage>,
    callback: grpc.sendUnaryData<agent.KeyPairMessage>,
  ) {
    try {
      this.failOnLocked();
      const { b } = call.request!.toObject();
      const keypair = this.pk.keyManager.getKeyPair();
      const response = new agent.KeyPairMessage();
      response.setPublicKey(keypair.public!);
      if (b) {
        response.setPrivateKey(keypair.private!);
      }
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getRootCertificate(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, agent.StringMessage>,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    try {
      this.failOnLocked();
      const rootCert = this.pk.keyManager.pki.RootCert;
      const response = new agent.StringMessage();
      response.setS(rootCert);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getSecret(
    call: grpc.ServerUnaryCall<agent.SecretPathMessage, agent.StringMessage>,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    try {
      this.failOnLocked();
      const { vaultName, secretName } = call.request!.toObject();
      const vault = this.pk.vaultManager.getVault(vaultName);
      const secret = vault.getSecret(secretName).toString();
      const response = new agent.StringMessage();
      response.setS(secret);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getStatus(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, agent.AgentStatusMessage>,
    callback: grpc.sendUnaryData<agent.AgentStatusMessage>,
  ) {
    try {
      const response = new agent.AgentStatusMessage();
      response.setStatus(agent.AgentStatusType.ONLINE);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async listKeys(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, agent.StringListMessage>,
    callback: grpc.sendUnaryData<agent.StringListMessage>,
  ) {
    try {
      this.failOnLocked();
      const keyNames = this.pk.keyManager.listKeys();
      const response = new agent.StringListMessage();
      response.setSList(keyNames);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  listNodes(
    call: grpc.ServerUnaryCall<agent.BooleanMessage, agent.StringListMessage>,
    callback: grpc.sendUnaryData<agent.StringListMessage>,
  ) {
    try {
      const { b } = call.request!.toObject();
      const response = new agent.StringListMessage();
      response.setSList([this.pk.polykeyPath]);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async listPeers(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, agent.StringListMessage>,
    callback: grpc.sendUnaryData<agent.StringListMessage>,
  ) {
    try {
      this.failOnLocked();
      const publicKeys = this.pk.peerManager.listPeers();
      const response = new agent.StringListMessage();
      response.setSList(publicKeys);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async listSecrets(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.StringListMessage>,
    callback: grpc.sendUnaryData<agent.StringListMessage>,
  ) {
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      const vault = this.pk.vaultManager.getVault(s);
      const secretNames = vault.listSecrets();
      const response = new agent.StringListMessage();
      response.setSList(secretNames);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async listVaults(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, agent.StringListMessage>,
    callback: grpc.sendUnaryData<agent.StringListMessage>,
  ) {
    try {
      this.failOnLocked();
      const vaultNames = this.pk.vaultManager.getVaultNames();
      const response = new agent.StringListMessage();
      response.setSList(vaultNames);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async newClientCertificate(
    call: grpc.ServerUnaryCall<agent.NewClientCertificateMessage, agent.NewClientCertificateMessage>,
    callback: grpc.sendUnaryData<agent.NewClientCertificateMessage>,
  ) {
    try {
      this.failOnLocked();
      const { domain, certFile, keyFile } = call.request!.toObject();
      const pki = this.pk.keyManager.pki
      const keypair = pki.createKeypair()
      const csr = pki.createCSR(domain, '', keypair);
      const cert = pki.handleCSR(csr)
      fs.mkdirSync(path.dirname(certFile), {recursive:true})
      fs.mkdirSync(path.dirname(keyFile), {recursive:true})
      fs.writeFileSync(certFile, cert)
      fs.writeFileSync(keyFile, pki.privateKeyToPem(keypair.privateKey))
      const response = new agent.NewClientCertificateMessage();
      response.setCertFile(cert);
      response.setKeyFile(pki.privateKeyToPem(keypair.privateKey));
      callback(null, response);
    } catch (error) {
      console.log(error);

      callback(error, null);
    }
  }

  async newNode(
    call: grpc.ServerUnaryCall<agent.NewNodeMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      const { userid, passphrase, nbits } = call.request!.toObject();

      // check node is already initialized
      if (this.pk.keyManager.hasPrivateKey()) {
        throw Error(`polykey keypair already exists at node path: '${this.pk.polykeyPath}'`);
      }

      const km = new KeyManager(this.pk.polykeyPath, fs);

      const resolvedNBits = nbits && nbits != 0 ? nbits : undefined;

      await km.generateKeyPair(userid, passphrase, resolvedNBits, true);

      this.pk = new Polykey(this.pk.polykeyPath, fs, km);

      const response = new agent.BooleanMessage();
      response.setB(true);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async newSecret(
    call: grpc.ServerUnaryCall<agent.SecretContentMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      this.failOnLocked();
      const { secretPath, secretFilePath, secretContent } = call.request!.toObject();
      const vault = this.pk.vaultManager.getVault(secretPath?.vaultName!);
      let secretBuffer: Buffer;
      if (secretFilePath) {
        secretBuffer = await fs.promises.readFile(secretFilePath);
      } else {
        secretBuffer = Buffer.from(secretContent);
      }
      await vault.addSecret(secretPath?.secretName!, secretBuffer);
      const response = new agent.BooleanMessage();
      response.setB(true);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async newVault(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      await this.pk.vaultManager.newVault(s);
      const response = new agent.BooleanMessage();
      response.setB(true);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async pingPeer(
    call: grpc.ServerUnaryCall<agent.ContactPeerMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      this.failOnLocked();
      const { publicKeyOrHandle, timeout } = call.request!.toObject();
      const successful = await this.pk.peerManager.pingPeer(publicKeyOrHandle, timeout);
      const response = new agent.BooleanMessage();
      response.setB(successful);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async pullVault(
    call: grpc.ServerUnaryCall<agent.VaultPathMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      this.failOnLocked();
      const { vaultName, publicKey } = call.request!.toObject();
      // pull if vault exists locally, otherwise clone
      if (this.pk.vaultManager.vaultExists(vaultName)) {
        const vault = this.pk.vaultManager.getVault(vaultName);
        await vault.pullVault(publicKey);
      } else {
        await this.pk.vaultManager.cloneVault(vaultName, publicKey);
      }
      const response = new agent.BooleanMessage();
      response.setB(true);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async registerNode(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      if (this.pk.keyManager.identityLoaded) {
        throw Error('node is already unlocked');
      }
      const { s } = call.request!.toObject();
      await this.pk.keyManager.unlockIdentity(s);

      // re-load all meta data
      await this.pk.keyManager.loadEncryptedMetadata();
      this.pk.peerManager.loadMetadata();
      await this.pk.vaultManager.loadEncryptedMetadata();
      await this.pk.httpApi.start();
      // send response
      const response = new agent.BooleanMessage();
      response.setB(true);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async requestHolePunch(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      const address = await this.pk.peerManager.turnClient.requestLocalHolePunchAddress(s);
      const response = new agent.BooleanMessage();
      response.setB(true);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async requestRelay(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      await this.pk.peerManager.turnClient.requestRelayConnection(s);
      const response = new agent.BooleanMessage();
      response.setB(true);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async scanVaultNames(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.StringListMessage>,
    callback: grpc.sendUnaryData<agent.StringListMessage>,
  ) {
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      const vaultNames = await this.pk.vaultManager.scanVaultNames(s);
      const response = new agent.StringListMessage();
      response.setSList(vaultNames);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async signFile(
    call: grpc.ServerUnaryCall<agent.SignFileMessage, agent.StringMessage>,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    try {
      this.failOnLocked();
      const { filePath, privateKeyPath, passphrase } = call.request!.toObject();
      const signaturePath = await this.pk.keyManager.signFile(filePath, privateKeyPath, passphrase);
      const response = new agent.StringMessage();
      response.setS(signaturePath);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async stopAgent(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      this.pk.peerManager.multicastBroadcaster.stopBroadcasting();
      const response = new agent.BooleanMessage();
      response.setB(true);
      this.configStore.clear();
      callback(null, response);
      await promisify(this.server.tryShutdown)();
      // finally kill the pid of the agent process
      if (process.env.NODE_ENV !== 'test') {
        process.kill(this.pid);
      }
    } catch (error) {
      callback(error, null);
    }
  }

  async toggleStealthMode(
    call: grpc.ServerUnaryCall<agent.BooleanMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      this.failOnLocked();
      const { b } = call.request!.toObject();
      this.pk.peerManager.toggleStealthMode(b);
      const response = new agent.BooleanMessage();
      response.setB(true);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async updateLocalPeerInfo(
    call: grpc.ServerUnaryCall<agent.PeerInfoMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      this.failOnLocked();
      const { publicKey, relayPublicKey, peerAddress, apiAddress } = call.request!.toObject();
      this.pk.peerManager.peerInfo.relayPublicKey = relayPublicKey;
      this.pk.peerManager.peerInfo.peerAddress = Address.parse(peerAddress);
      this.pk.peerManager.peerInfo.apiAddress = Address.parse(apiAddress);
      const response = new agent.BooleanMessage();
      response.setB(true);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async updatePeerInfo(
    call: grpc.ServerUnaryCall<agent.PeerInfoMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      this.failOnLocked();
      const { publicKey, relayPublicKey, peerAddress, apiAddress } = call.request!.toObject();
      if (!this.pk.peerManager.hasPeer(publicKey)) {
        throw Error('peer does not exist in store');
      }
      const peerInfo = this.pk.peerManager.getPeer(publicKey)!;
      peerInfo.relayPublicKey = relayPublicKey;
      peerInfo.peerAddress = Address.parse(peerAddress);
      peerInfo.apiAddress = Address.parse(apiAddress);
      this.pk.peerManager.updatePeer(peerInfo);
      const response = new agent.BooleanMessage();
      response.setB(true);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async updateSecret(
    call: grpc.ServerUnaryCall<agent.SecretContentMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      this.failOnLocked();
      const { secretPath, secretFilePath, secretContent } = call.request!.toObject();
      const vault = this.pk.vaultManager.getVault(secretPath?.vaultName!);
      let secretBuffer: Buffer;
      if (secretFilePath) {
        secretBuffer = await fs.promises.readFile(secretFilePath);
      } else {
        secretBuffer = Buffer.from(secretContent);
      }
      await vault.updateSecret(secretPath?.secretName!, secretBuffer);
      const response = new agent.BooleanMessage();
      response.setB(true);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async verifyFile(
    call: grpc.ServerUnaryCall<agent.VerifyFileMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    try {
      this.failOnLocked();
      const { publicKeyPath, filePath } = call.request!.toObject();
      const verified = await this.pk.keyManager.verifyFile(filePath, publicKeyPath);
      const response = new agent.BooleanMessage();
      response.setB(true);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  ///////////////////////
  // Client Connection //
  ///////////////////////
  static connectToAgent(polykeyPath: string): AgentClient {
    const configStore = PolykeyAgent.ConfigStore(polykeyPath);

    const port = parseInt(configStore.get('port'));

    if (!port) {
      throw Error(`polykey agent is not started at polykey path: '${polykeyPath}'`);
    } else {
      // get credentials
      const caStoreConfig = PolykeyAgent.CAStore(polykeyPath);

      // check if credentials exist for current polykey path
      let credentials: grpc.ChannelCredentials;
      if (caStoreConfig.has(polykeyPath)) {
        const caStore: CAStore = caStoreConfig.get(polykeyPath)!;
        credentials = grpc.ChannelCredentials.createSsl(
          Buffer.from(caStore.rootCert),
          Buffer.from(caStore.clientKeyPair.private),
          Buffer.from(caStore.clientCert),
        );
      } else {
        credentials = grpc.credentials.createInsecure();
      }

      const client = new AgentClient(`localhost:${port}`, credentials);
      return client;
    }
  }

  static ConfigStore(polykeyPath: string): ConfigStore {
    const configStore = new ConfigStore('polykey', undefined, {
      configPath: path.join(polykeyPath, '.agent', '.config.json'),
    });
    return configStore;
  }

  //////////////////////
  // Agent Operations //
  //////////////////////
  private static DAEMON_SCRIPT_PATH_PREFIX = path.resolve(__dirname, 'internal', 'daemon-script.');
  private static DAEMON_SCRIPT_PATH_SUFFIX = fs.existsSync(PolykeyAgent.DAEMON_SCRIPT_PATH_PREFIX + 'js') ? 'js' : 'ts';
  static DAEMON_SCRIPT_PATH = PolykeyAgent.DAEMON_SCRIPT_PATH_PREFIX + PolykeyAgent.DAEMON_SCRIPT_PATH_SUFFIX;

  private static AgentIsRunning(polykeyPath: string): boolean {
    const existingPid = PolykeyAgent.AgentPid(polykeyPath);
    if (existingPid) {
      try {
        process.kill(existingPid, 0);
        return true;
      } catch (e) {
        return false;
      }
    } else {
      return false;
    }
  }

  private static AgentPid(polykeyPath: string): number {
    const configStore = PolykeyAgent.ConfigStore(polykeyPath);
    return parseInt(configStore.get('pid'));
  }

  public static async startAgent(polykeyPath: string, daemon: boolean = false, failOnNotInitialized: boolean = true) {
    // either resolves a newly started process ID or true if the process is running already
    return new Promise<number | true>((resolve, reject) => {
      try {
        if (failOnNotInitialized && !fs.existsSync(path.join(polykeyPath, '.keys', 'private_key'))) {
          throw Error(`polykey node has not been initialized, initialize with 'pk agent init'`);
        }

        // check if agent is already running
        if (PolykeyAgent.AgentIsRunning(polykeyPath)) {
          resolve(true);
        } else {
          const logPath = path.join(polykeyPath, '.agent', 'log');

          if (fs.existsSync(logPath)) {
            fs.rmdirSync(logPath, { recursive: true });
          }
          fs.mkdirSync(logPath, { recursive: true });

          let options: SpawnOptions = {
            uid: process.getuid(),
            detached: daemon,
            stdio: [
              'ignore',
              fs.openSync(path.join(logPath, 'output.log'), 'a'),
              fs.openSync(path.join(logPath, 'error.log'), 'a'),
              'ipc',
            ],
          };

          const agentProcess = spawn(
            PolykeyAgent.DAEMON_SCRIPT_PATH.includes('.js') ? 'node' : 'ts-node',
            [PolykeyAgent.DAEMON_SCRIPT_PATH],
            options,
          );

          agentProcess.send(polykeyPath, (err: Error) => {
            if (err) {
              agentProcess.kill('SIGTERM');
              reject(err);
            } else {
              const pid = agentProcess.pid;
              agentProcess.on('message', (msg) => {
                agentProcess.unref();
                agentProcess.disconnect();
                if (msg === 'started') {
                  resolve(pid);
                } else {
                  reject('something went wrong, child process did not start polykey agent');
                }
              });
            }
          });
        }
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default PolykeyAgent;
