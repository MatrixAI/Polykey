import fs from 'fs';
import path from 'path';
import process from 'process';
import { getPort } from '../utils';
import { promisify } from 'util';
import ConfigStore from 'configstore';
import * as grpc from '@grpc/grpc-js';
import { spawn, SpawnOptions } from 'child_process';
import * as agent from '../../proto/compiled/Agent_pb';
import { Polykey, PeerInfo, Address, KeyManager } from '../Polykey';
import { AgentService, IAgentServer, AgentClient } from '../../proto/compiled/Agent_grpc_pb';

class PolykeyAgent implements IAgentServer {
  private pid: number;
  private pk: Polykey;
  private configStore: ConfigStore;

  private server: grpc.Server;
  private pidCheckInterval: NodeJS.Timeout;

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
    this.server.addService(AgentService, (this as any) as grpc.UntypedServiceImplementation);
  }

  private failOnLocked() {
    if (!this.pk.keyManager.KeypairUnlocked) {
      throw Error(`polykey is locked at ${this.pk.polykeyPath}`);
    }
  }

  private get ServerCredentials() {
    // define certificate/key paths
    const clientPKIPath = path.join(this.pk.polykeyPath, '.agent', 'PKI');
    fs.mkdirSync(clientPKIPath, { recursive: true });
    const rootCertPath = path.join(clientPKIPath, 'root.crt');
    const clientCertPath = path.join(clientPKIPath, 'client.crt');
    const clientPublicKeyPath = path.join(clientPKIPath, 'client-public.key');
    const clientPrivateKeyPath = path.join(clientPKIPath, 'client-private.key');

    // retreive client credentials from keymanager
    const clientCreds = this.pk.keyManager.pki.createClientCredentials();

    // write to file
    fs.writeFileSync(rootCertPath, this.pk.keyManager.pki.RootCert);
    fs.writeFileSync(clientCertPath, clientCreds.certificate);
    fs.writeFileSync(clientPublicKeyPath, clientCreds.keypair.public);
    fs.writeFileSync(clientPrivateKeyPath, clientCreds.keypair.private);

    ////////////////////////
    // Server credentials //
    ////////////////////////
    const tlsCredentials = this.pk.keyManager.pki.createServerCredentials();
    if (tlsCredentials) {
      return grpc.ServerCredentials.createSsl(
        Buffer.from(this.pk.keyManager.pki.RootCert),
        [
          {
            private_key: Buffer.from(tlsCredentials.keypair.private),
            cert_chain: Buffer.from(tlsCredentials.certificate),
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
      await promisify(this.server.tryShutdown.bind(this))();
    } catch (error) {}

    // handle port
    const portString = this.configStore.get('port') ?? process.env.PK_AGENT_PORT ?? 0;
    const hostString = process.env.PK_AGENT_HOST ?? 'localhost';
    const port = await getPort(parseInt(portString), hostString);

    // bind server to port and start
    const boundPort = await new Promise<number>((resolve, reject) => {
      this.server.bindAsync(`${hostString}:${port}`, this.ServerCredentials, (error, boundPort) => {
        if (error) {
          reject(error);
        } else {
          resolve(boundPort);
        }
      });
    });

    // check every 10 seconds whether agent is still discoverable
    // agent is only discoverable if the pid in the pk state matches
    // the pid of the current running pid. this also prevents memory leaks
    this.pidCheckInterval = setInterval(() => {
      let shutdown = false;
      try {
        const pid = this.configStore.get('pid');
        if (pid !== this.pid) {
          shutdown = true;
          console.log('agent process pid does not match pk state pid, shutting down');
        }
      } catch (error) {
        shutdown = true;
        console.log('pid is not set in pk state, shutting down');
      } finally {
        if (shutdown) {
          this.server.tryShutdown((err) => {
            if (err) {
              console.log(`ran into errors when shutting down grpc server: ${err}`);
            }
            process.kill(this.pid);
          });
        }
      }
    }, 10000);

    this.server.start();
    this.configStore.set('port', boundPort);
    console.log(`Agent started on: 'localhost:${boundPort}'`);
  }

  private noThrowRefreshTimeout() {
    try {
      this.pk.keyManager.refreshTimeout();
    } catch (error) {}
  }

  async addPeer(
    call: grpc.ServerUnaryCall<agent.PeerInfoMessage, agent.StringMessage>,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { publicKey, rootCertificate, peerAddress, apiAddress } = call.request!.toObject();
      const peerId = this.pk.peerManager.addPeer(new PeerInfo(publicKey, rootCertificate, peerAddress, apiAddress));
      const response = new agent.StringMessage();
      response.setS(peerId);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async decryptFile(
    call: grpc.ServerUnaryCall<agent.DecryptFileMessage, agent.StringMessage>,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { filePath, privateKeyPath, passphrase } = call.request!.toObject();
      const response = new agent.StringMessage();
      if (privateKeyPath && passphrase) {
        const privateKey = fs.readFileSync(privateKeyPath);
        const decryptedPath = await this.pk.keyManager.decryptFile(filePath, privateKey, passphrase);
        response.setS(decryptedPath);
      } else {
        const decryptedPath = await this.pk.keyManager.decryptFile(filePath);
        response.setS(decryptedPath);
      }
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async deleteKey(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    this.noThrowRefreshTimeout();
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

  async deleteVault(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      await this.pk.vaultManager.deleteVault(s);
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async deleteSecret(
    call: grpc.ServerUnaryCall<agent.SecretPathMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { vaultName, secretName } = call.request!.toObject();
      const vault = this.pk.vaultManager.getVault(vaultName);
      await vault.deleteSecret(secretName, true);
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async deriveKey(
    call: grpc.ServerUnaryCall<agent.DeriveKeyMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { keyName, passphrase } = call.request!.toObject();
      await this.pk.keyManager.generateKey(keyName, passphrase);
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async deriveKeyPair(
    call: grpc.ServerUnaryCall<agent.DeriveKeyPairMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { keypairDetails: { userid, passphrase } = {}, publicKeyPath, privateKeyPath } = call.request!.toObject();
      const { public: publicKey, private: privateKey } = await this.pk.keyManager.generateKeyPair(
        userid!,
        passphrase!,
        false,
      );
      // Make sure public and private key paths are able to be created and are not directories
      if (fs.statSync(publicKeyPath).isDirectory() || !fs.statSync(path.dirname(publicKeyPath)).isDirectory()) {
        throw Error('the public key path must be a valid file path and must not exist already');
      }
      if (fs.statSync(privateKeyPath).isDirectory() || !fs.statSync(path.dirname(privateKeyPath)).isDirectory()) {
        throw Error('the private key path must be a valid file path and must not exist already');
      }
      fs.writeFileSync(publicKeyPath, publicKey!);
      fs.writeFileSync(privateKeyPath, privateKey!);
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async encryptFile(
    call: grpc.ServerUnaryCall<agent.EncryptFileMessage, agent.StringMessage>,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    this.noThrowRefreshTimeout();
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
    this.noThrowRefreshTimeout();
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
    call: grpc.ServerUnaryCall<agent.ContactPeerMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { publicKeyOrHandle, timeout } = call.request!.toObject();
      // eslint-disable-next-line
      const usernameRegex = /^\@([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/;
      const matches = publicKeyOrHandle.match(usernameRegex)!;
      const service = matches[1]!;
      const handle = matches[2]!;
      const successful = await this.pk.peerManager.findSocialUser(handle, service, timeout);
      if (!successful) {
        throw Error('peer did not respond to ping before timeout');
      }
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async getOAuthClient(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, agent.OAuthClientMessage>,
    callback: grpc.sendUnaryData<agent.OAuthClientMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const client = this.pk.httpApi.getOAuthClient();
      const response = new agent.OAuthClientMessage();
      response.setId(client.id);
      response.setSecret(client.Secret);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getKey(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.StringMessage>,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    this.noThrowRefreshTimeout();
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
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      const peerInfo = this.pk.peerManager.peerInfo;
      const response = new agent.PeerInfoMessage();
      response.setPublicKey(peerInfo.publicKey);
      response.setRootCertificate(peerInfo.rootCertificate);
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
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      if (!this.pk.peerManager.hasPeer(s)) {
        throw Error('public key does not exist in peer store');
      }
      const peerInfo = this.pk.peerManager.getPeer(s)!;
      const response = new agent.PeerInfoMessage();
      response.setPublicKey(peerInfo.publicKey);
      response.setRootCertificate(peerInfo.rootCertificate);
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
    this.noThrowRefreshTimeout();
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

  async getSecret(
    call: grpc.ServerUnaryCall<agent.SecretPathMessage, agent.StringMessage>,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    this.noThrowRefreshTimeout();
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
    this.noThrowRefreshTimeout();
    try {
      const response = new agent.AgentStatusMessage();
      response.setStatus(agent.AgentStatusType.ONLINE);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getVaultStats(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.VaultStatsMessage>,
    callback: grpc.sendUnaryData<agent.VaultStatsMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      const { s } = call.request!.toObject();

      const vault = this.pk.vaultManager.getVault(s);
      const vaultStats = await vault.stats();
      const response = new agent.VaultStatsMessage();
      response.setCreatedAt(vaultStats.birthtime.getUTCMilliseconds());
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async listOAuthTokens(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, agent.StringListMessage>,
    callback: grpc.sendUnaryData<agent.StringListMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const tokens = this.pk.httpApi.listOAuthTokens();
      const response = new agent.StringListMessage();
      response.setSList(tokens);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async listKeys(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, agent.StringListMessage>,
    callback: grpc.sendUnaryData<agent.StringListMessage>,
  ) {
    this.noThrowRefreshTimeout();
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
    this.noThrowRefreshTimeout();
    try {
      const { b } = call.request!.toObject();
      const response = new agent.StringListMessage();
      response.setSList([this.pk.polykeyPath]);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getRootCertificate(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, agent.StringMessage>,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    this.noThrowRefreshTimeout();
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

  async listPeers(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, agent.StringListMessage>,
    callback: grpc.sendUnaryData<agent.StringListMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const publicKeys = this.pk.peerManager.listPeers();
      const peerList = publicKeys.map((peerId) => {
        const alias = this.pk.peerManager.getPeerAlias(peerId);
        if (!alias) {
          return peerId;
        }
        return `${alias} (${peerId})`;
      });
      const response = new agent.StringListMessage();
      response.setSList(peerList);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async listSecrets(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.StringListMessage>,
    callback: grpc.sendUnaryData<agent.StringListMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
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
    this.noThrowRefreshTimeout();
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

  async lockNode(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    try {
      this.failOnLocked();
      this.pk.keyManager.lockIdentity();
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async newOAuthToken(
    call: grpc.ServerUnaryCall<agent.NewOAuthTokenMessage, agent.StringMessage>,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { scopesList, expiry } = call.request!.toObject();
      const token = this.pk.httpApi.newOAuthToken(scopesList, expiry);
      const response = new agent.StringMessage();
      response.setS(token);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async newClientCertificate(
    call: grpc.ServerUnaryCall<agent.NewClientCertificateMessage, agent.NewClientCertificateMessage>,
    callback: grpc.sendUnaryData<agent.NewClientCertificateMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { domain, certFile, keyFile } = call.request!.toObject();
      const pki = this.pk.keyManager.pki;
      const keypair = pki.createKeypair();
      const csr = pki.createCSR(domain, '', keypair);
      const cert = pki.handleCSR(csr);
      fs.mkdirSync(path.dirname(certFile), { recursive: true });
      fs.mkdirSync(path.dirname(keyFile), { recursive: true });
      fs.writeFileSync(certFile, cert);
      fs.writeFileSync(keyFile, pki.privateKeyToPem(keypair.privateKey));
      const response = new agent.NewClientCertificateMessage();
      response.setCertFile(cert);
      response.setKeyFile(pki.privateKeyToPem(keypair.privateKey));
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async initializeNode(
    call: grpc.ServerUnaryCall<agent.NewKeyPairMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    try {
      const { userid, passphrase } = call.request!.toObject();

      // check node is already initialized
      if (this.pk.keyManager.hasPrivateKey()) {
        throw Error(`polykey keypair already exists at node path: '${this.pk.polykeyPath}'`);
      }

      const km = new KeyManager(this.pk.polykeyPath, fs);

      await km.generateKeyPair(userid, passphrase, true);

      this.pk = new Polykey(this.pk.polykeyPath, fs, km);

      // re-load all meta data
      await this.pk.keyManager.loadEncryptedMetadata();
      this.pk.peerManager.loadMetadata();
      await this.pk.vaultManager.loadEncryptedMetadata();
      await this.pk.httpApi.start();

      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async newSecret(
    call: grpc.ServerUnaryCall<agent.SecretContentMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { secretPath, secretFilePath, secretContent } = call.request!.toObject();
      const vault = this.pk.vaultManager.getVault(secretPath?.vaultName!);
      if (fs.statSync(secretFilePath).isDirectory()) {
        await vault.addSecrets(secretFilePath);
        callback(null, new agent.EmptyMessage());
      } else {
        let secretBuffer: Buffer;
        if (secretFilePath) {
          secretBuffer = await fs.promises.readFile(secretFilePath);
        } else {
          secretBuffer = Buffer.from(secretContent);
        }
        await vault.addSecret(secretPath?.secretName!, secretBuffer);
        callback(null, new agent.EmptyMessage());
      }
    } catch (error) {
      callback(error, null);
    }
  }

  async newVault(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      await this.pk.vaultManager.newVault(s);
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async pingPeer(
    call: grpc.ServerUnaryCall<agent.ContactPeerMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { publicKeyOrHandle, timeout } = call.request!.toObject();
      const successful = await this.pk.peerManager.pingPeer(publicKeyOrHandle, timeout);
      if (!successful) {
        throw Error('peer did not respond to ping before timeout');
      }
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async pullVault(
    call: grpc.ServerUnaryCall<agent.VaultPathMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
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
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async renameVault(
    call: grpc.ServerUnaryCall<agent.RenameVaultMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { vaultName, newName } = call.request!.toObject();

      this.pk.vaultManager.renameVault(vaultName, newName);

      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async revokeOAuthToken(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      const successful = this.pk.httpApi.revokeOAuthToken(s);
      const response = new agent.BooleanMessage();
      response.setB(successful);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async scanVaultNames(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.StringListMessage>,
    callback: grpc.sendUnaryData<agent.StringListMessage>,
  ) {
    this.noThrowRefreshTimeout();
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

  async setAlias(
    call: grpc.ServerUnaryCall<agent.PeerAliasMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { peerId, alias } = call.request!.toObject();
      this.pk.peerManager.setPeerAlias(peerId, alias);
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async shareVault(
    call: grpc.ServerUnaryCall<agent.ShareVaultMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { vaultName, peerId, canEdit } = call.request!.toObject();
      const vault = this.pk.vaultManager.getVault(vaultName);
      vault.shareVault(peerId, canEdit);
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async signFile(
    call: grpc.ServerUnaryCall<agent.SignFileMessage, agent.StringMessage>,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    this.noThrowRefreshTimeout();
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

  async socialProof(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, agent.PeerInfoMessage>,
    callback: grpc.sendUnaryData<agent.PeerInfoMessage>,
  ) {
    try {
      clearInterval(this.pidCheckInterval);
      this.pk.peerManager.multicastBroadcaster.stopBroadcasting();
      this.configStore.clear();
      const response = new agent.PeerInfoMessage();
      const peerInfo = this.pk.peerManager.peerInfo;
      response.setPublicKey(peerInfo.publicKey);
      response.setRootCertificate(peerInfo.rootCertificate);
      if (peerInfo.peerAddress) {
        response.setPeerAddress(peerInfo.peerAddress?.toString());
      }
      if (peerInfo.apiAddress) {
        response.setApiAddress(peerInfo.apiAddress?.toString());
      }
      callback(null, response);
      await promisify(this.server.tryShutdown.bind(this.server))();
    } catch (error) {
      callback(error, null);
    } finally {
      // finally kill the pid of the agent process
      if (process.env.NODE_ENV !== 'test') {
        process.kill(this.pid);
      }
    }
  }

  async stopAgent(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    try {
      clearInterval(this.pidCheckInterval);
      this.pk.peerManager.multicastBroadcaster.stopBroadcasting();
      this.configStore.clear();
      callback(null, new agent.EmptyMessage());
      await promisify(this.server.tryShutdown.bind(this.server))();
    } catch (error) {
      callback(error, null);
    } finally {
      // finally kill the pid of the agent process
      if (process.env.NODE_ENV !== 'test') {
        process.kill(this.pid);
      }
    }
  }

  async toggleStealthMode(
    call: grpc.ServerUnaryCall<agent.BooleanMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { b } = call.request!.toObject();
      this.pk.peerManager.toggleStealthMode(b);
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async unsetAlias(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      this.pk.peerManager.unsetPeerAlias(s);
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async unlockNode(
    call: grpc.ServerUnaryCall<agent.UnlockNodeMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    try {
      const { passphrase, timeout } = call.request!.toObject();
      if (this.pk.keyManager.KeypairUnlocked) {
        this.pk.keyManager.refreshTimeout(timeout);
      } else {
        await this.pk.keyManager.unlockIdentity(passphrase, timeout);
      }

      // re-load all meta data
      await this.pk.keyManager.loadEncryptedMetadata();
      this.pk.peerManager.loadMetadata();
      await this.pk.vaultManager.loadEncryptedMetadata();
      await this.pk.httpApi.start();

      // send response
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async unshareVault(
    call: grpc.ServerUnaryCall<agent.VaultPathMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { vaultName, publicKey } = call.request!.toObject();
      const vault = this.pk.vaultManager.getVault(vaultName);
      vault.unshareVault(publicKey);
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async updateLocalPeerInfo(
    call: grpc.ServerUnaryCall<agent.PeerInfoMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { rootCertificate, peerAddress, apiAddress } = call.request!.toObject();
      if (rootCertificate && rootCertificate != '') {
        this.pk.peerManager.peerInfo.rootCertificate = rootCertificate;
      }
      if (peerAddress) {
        this.pk.peerManager.peerInfo.peerAddress = Address.parse(peerAddress);
      } else if (peerAddress == '') {
        this.pk.peerManager.peerInfo.peerAddress = undefined;
      }
      if (apiAddress) {
        this.pk.peerManager.peerInfo.apiAddress = Address.parse(apiAddress);
      } else if (apiAddress == '') {
        this.pk.peerManager.peerInfo.apiAddress = undefined;
      }
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async updatePeerInfo(
    call: grpc.ServerUnaryCall<agent.PeerInfoMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { publicKey: peerId, rootCertificate, peerAddress, apiAddress } = call.request!.toObject();
      if (!this.pk.peerManager.hasPeer(peerId)) {
        throw Error('peer does not exist in store');
      }
      const peerInfo = this.pk.peerManager.getPeer(peerId)!;
      if (rootCertificate && rootCertificate != '') {
        peerInfo.rootCertificate = rootCertificate;
      }
      if (peerAddress) {
        this.pk.peerManager.peerInfo.peerAddress = Address.parse(peerAddress);
      } else if (peerAddress == '') {
        this.pk.peerManager.peerInfo.peerAddress = undefined;
      }
      if (apiAddress) {
        this.pk.peerManager.peerInfo.apiAddress = Address.parse(apiAddress);
      } else if (apiAddress == '') {
        this.pk.peerManager.peerInfo.apiAddress = undefined;
      }
      this.pk.peerManager.updatePeer(peerInfo);
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async updateSecret(
    call: grpc.ServerUnaryCall<agent.SecretContentMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
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
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async verifyFile(
    call: grpc.ServerUnaryCall<agent.VerifyFileMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.noThrowRefreshTimeout();
    try {
      this.failOnLocked();
      const { publicKeyPath, filePath } = call.request!.toObject();
      const verified = await this.pk.keyManager.verifyFile(filePath, publicKeyPath);
      if (!verified) {
        throw Error('file could not be verified');
      }
      callback(null, new agent.EmptyMessage());
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
      const clientPKIPath = path.join(polykeyPath, '.agent', 'PKI');
      const rootCertPath = path.join(clientPKIPath, 'root.crt');
      const clientCertPath = path.join(clientPKIPath, 'client.crt');
      const clientPrivateKeyPath = path.join(clientPKIPath, 'client-private.key');
      // check if credentials exist for current polykey path
      let credentials: grpc.ChannelCredentials;
      if (
        fs.existsSync(clientPKIPath) &&
        fs.existsSync(rootCertPath) &&
        fs.existsSync(clientCertPath) &&
        fs.existsSync(clientPrivateKeyPath)
      ) {
        credentials = grpc.ChannelCredentials.createSsl(
          Buffer.from(fs.readFileSync(rootCertPath)),
          Buffer.from(fs.readFileSync(clientPrivateKeyPath)),
          Buffer.from(fs.readFileSync(clientCertPath)),
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
      configPath: path.join(polykeyPath, '.agent', 'config.json'),
    });
    return configStore;
  }

  //////////////////////
  // Agent Operations //
  //////////////////////
  static get DAEMON_SCRIPT_PATH(): string {
    const prefix = path.resolve(__dirname, 'internal', 'polykey-daemon.');
    const suffix = fs.existsSync(prefix + 'js') ? 'js' : 'ts';
    return prefix + suffix;
  }

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

  public static async startAgent(polykeyPath: string, daemon = false, failOnNotInitialized = true) {
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

          const options: SpawnOptions = {
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
