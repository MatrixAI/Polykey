import fs from 'fs';
import os from 'os';
import path from 'path';
import process from 'process';
import { promisify } from 'util';
import { getPort } from '../utils';
import { md, pki } from 'node-forge';
import ConfigStore from 'configstore';
import * as grpc from '@grpc/grpc-js';
import * as agent from '../../proto/js/Agent_pb';
import { spawn, SpawnOptions } from 'child_process';
import { PeerInfoReadOnly } from '../peers/PeerInfo';
import Polykey, { Address, KeyManager } from '../Polykey';
import { TLSCredentials } from '../peers/pki/PublicKeyInfrastructure';
import {
  AgentService,
  IAgentServer,
  AgentClient,
} from '../../proto/js/Agent_grpc_pb';
import { LinkInfo, LinkInfoIdentity } from '../links';
import { gestaltToProtobuf } from '@/gestalts';

class PolykeyAgent implements IAgentServer {
  private pid: number;
  private pk: Polykey;
  private configStore: ConfigStore;

  private server: grpc.Server;
  private pidCheckInterval: ReturnType<typeof setInterval>;

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
    this.server.addService(
      AgentService,
      (this as any) as grpc.UntypedServiceImplementation,
    );
  }

  private failOnLocked() {
    if (!this.pk.keyManager.KeypairUnlocked) {
      throw Error(`polykey is locked at ${this.pk.polykeyPath}`);
    }
  }

  private get ServerCredentials() {
    const paths = PolykeyAgent.AgentSSLPaths(this.pk.polykeyPath);
    // create agent ssl credentials
    // create root credentials
    const rootCredentials = PolykeyAgent.createAgentRootCredentials();
    fs.writeFileSync(paths.root.cert, rootCredentials.certificate);
    fs.writeFileSync(
      paths.root.keypair.private,
      rootCredentials.keypair.private,
    );
    fs.writeFileSync(paths.root.keypair.public, rootCredentials.keypair.public);
    // create agent server credentials
    const serverCredentials = PolykeyAgent.createAgentServerCredentials(
      pki.certificateFromPem(rootCredentials.certificate),
      pki.privateKeyFromPem(rootCredentials.keypair.private),
    );
    fs.writeFileSync(paths.server.cert, serverCredentials.certificate);
    fs.writeFileSync(
      paths.server.keypair.private,
      serverCredentials.keypair.private,
    );
    fs.writeFileSync(
      paths.server.keypair.public,
      serverCredentials.keypair.public,
    );
    // create agent client credentials
    const clientCredentials = PolykeyAgent.createAgentClientCredentials(
      pki.certificateFromPem(rootCredentials.certificate),
      pki.privateKeyFromPem(rootCredentials.keypair.private),
    );
    fs.writeFileSync(paths.client.cert, clientCredentials.certificate);
    fs.writeFileSync(
      paths.client.keypair.private,
      clientCredentials.keypair.private,
    );
    fs.writeFileSync(
      paths.client.keypair.public,
      clientCredentials.keypair.public,
    );
    ////////////////////////
    // Server credentials //
    ////////////////////////
    return grpc.ServerCredentials.createSsl(
      Buffer.from(rootCredentials.certificate),
      [
        {
          private_key: Buffer.from(serverCredentials.keypair.private),
          cert_chain: Buffer.from(serverCredentials.certificate),
        },
      ],
      false,
    );
  }

  async startServer() {
    // first try and stop server if its still running
    await promisify(this.server.tryShutdown.bind(this))();

    // handle port
    const portString =
      this.configStore.get('port') ?? process.env.PK_AGENT_PORT ?? 0;
    const hostString = process.env.PK_AGENT_HOST ?? 'localhost';
    const port = await getPort(parseInt(portString), hostString);

    // bind server to port and start
    const boundPort = await new Promise<number>((resolve, reject) => {
      this.server.bindAsync(
        `${hostString}:${port}`,
        this.ServerCredentials,
        (error, boundPort) => {
          if (error) {
            reject(error);
          } else {
            resolve(boundPort);
          }
        },
      );
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
          console.log(
            'agent process pid does not match pk state pid, shutting down',
          );
        }
      } catch (error) {
        shutdown = true;
        console.log('pid is not set in pk state, shutting down');
      } finally {
        if (shutdown) {
          this.server.tryShutdown((err) => {
            if (err) {
              console.log(
                `ran into errors when shutting down grpc server: ${err}`,
              );
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

  private refreshTimeout() {
    this.pk.keyManager.refreshTimeout();
  }

  async addPeer(
    call: grpc.ServerUnaryCall<
      agent.PeerInfoReadOnlyMessage,
      agent.StringMessage
    >,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();

      const {
        pem,
        unsignedAlias,
        unsignedPeerAddress,
        unsignedApiAddress,
      } = call.request!.toObject();
      const peerInfo = new PeerInfoReadOnly(pem);
      if (unsignedAlias) {
        peerInfo.alias = unsignedAlias;
      }
      if (unsignedPeerAddress) {
        peerInfo.peerAddress = Address.parse(unsignedPeerAddress);
      }
      if (unsignedApiAddress) {
        peerInfo.apiAddress = Address.parse(unsignedApiAddress);
      }
      const peerId = this.pk.peerManager.addPeer(peerInfo);
      const response = new agent.StringMessage();
      response.setS(peerId);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async augmentKeynode(
    call: grpc.ServerUnaryCall<
      agent.AugmentKeynodeRequest,
      agent.AugmentKeynodeReply
    >,
    callback: grpc.sendUnaryData<agent.AugmentKeynodeReply>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();

      const { providerKey, identityKey } = call.request!.toObject();

      // create link claim
      const linkClaim = await this.pk.peerManager.makeLinkClaimIdentity(
        providerKey,
        identityKey,
      );

      // publish the newly made link claim
      const provider = this.pk.providerManager.getProvider(
        providerKey ?? 'github.com',
      );
      const linkInfoIdentity = await provider.publishLinkClaim(linkClaim);
      const linkInfo = linkInfoIdentity as LinkInfo;

      // // publish it to the peer info
      this.pk.peerManager.peerInfo.publishLinkInfo(linkInfo);
      this.pk.peerManager.writeMetadata();

      // get identity details
      const identityInfo = await provider.getIdentityInfo(identityKey);
      if (identityInfo) {
        // set the link identity in the gestalt graph
        this.pk.gestaltGraph.setLinkIdentity(
          linkInfoIdentity,
          { id: this.pk.peerManager.peerInfo.id },
          identityInfo,
        );
      }

      const response = new agent.AugmentKeynodeReply();

      response.setUrl(linkInfoIdentity.url ?? '');
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async authenticateProvider(
    call: grpc.ServerUnaryCall<
      agent.AuthenticateProviderRequest,
      agent.AuthenticateProviderReply
    >,
    callback: grpc.sendUnaryData<agent.AuthenticateProviderReply>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();

      const { providerKey } = call.request!.toObject();

      const provider = this.pk.providerManager.getProvider(
        providerKey ?? 'github.com',
      );
      const authFlow = provider.authenticate();
      // get user code
      const userCode = (await authFlow.next()).value;
      if (typeof userCode != 'string') {
        throw Error('userCode was not a string');
      }

      // trigger next as a lazy promise o the code can continue
      // after grpc destroys this functions context
      authFlow.next();

      // return the usercode tot he client
      const response = new agent.AuthenticateProviderReply();
      response.setUserCode(userCode);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async decryptFile(
    call: grpc.ServerUnaryCall<agent.DecryptFileMessage, agent.StringMessage>,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { filePath, privateKeyPath, passphrase } = call.request!.toObject();
      const response = new agent.StringMessage();
      if (privateKeyPath && passphrase) {
        const privateKey = fs.readFileSync(privateKeyPath);
        const decryptedPath = await this.pk.keyManager.decryptFile(
          filePath,
          privateKey,
          passphrase,
        );
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
    this.refreshTimeout();
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
    this.refreshTimeout();
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
    this.refreshTimeout();
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
    this.refreshTimeout();
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
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const {
        keypairDetails: { passphrase, nbits } = {},
        publicKeyPath,
        privateKeyPath,
      } = call.request!.toObject();
      const {
        publicKey,
        privateKey,
      } = await this.pk.keyManager.generateKeyPair(passphrase ?? '', nbits);
      // Make sure public and private key paths are able to be created and are not directories
      if (
        fs.statSync(publicKeyPath).isDirectory() ||
        !fs.statSync(path.dirname(publicKeyPath)).isDirectory()
      ) {
        throw Error(
          'the public key path must be a valid file path and must not exist already',
        );
      }
      if (
        fs.statSync(privateKeyPath).isDirectory() ||
        !fs.statSync(path.dirname(privateKeyPath)).isDirectory()
      ) {
        throw Error(
          'the private key path must be a valid file path and must not exist already',
        );
      }
      fs.writeFileSync(publicKeyPath, publicKey!);
      fs.writeFileSync(privateKeyPath, privateKey!);
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async discoverGestaltNode(
    call: grpc.ServerWritableStream<agent.IdentityMessage, agent.EmptyMessage>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { key } = call.request!.toObject();
      for await (const _ of this.pk.gestaltGraph.discoverGestaltNode(key)) {
        call.write(new agent.EmptyMessage());
      }
      call.end();
    } catch (error) {
      call.end();
    }
  }

  async discoverGestaltIdentity(
    call: grpc.ServerWritableStream<agent.IdentityMessage, agent.EmptyMessage>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { key, providerKey } = call.request!.toObject();
      for await (const _ of this.pk.gestaltGraph.discoverGestaltIdentity(
        key,
        providerKey,
      )) {
        call.write(new agent.EmptyMessage());
      }
      call.end();
    } catch (error) {
      call.end();
    }
  }

  async encryptFile(
    call: grpc.ServerUnaryCall<agent.EncryptFileMessage, agent.StringMessage>,
    callback: grpc.sendUnaryData<agent.StringMessage>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { filePath, publicKeyPath } = call.request!.toObject();
      const encryptedPath = await this.pk.keyManager.encryptFile(
        filePath,
        publicKeyPath,
      );
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
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { publicKeyOrHandle, timeout } = call.request!.toObject();
      const successful = await this.pk.peerManager.findPublicKey(
        publicKeyOrHandle,
        timeout,
      );
      const response = new agent.BooleanMessage();
      response.setB(successful);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async gestaltIsTrusted(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.BooleanMessage>,
    callback: grpc.sendUnaryData<agent.BooleanMessage>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      const response = new agent.BooleanMessage();
      response.setB(this.pk.gestaltGraph.trusted(s));
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getConnectedIdentityInfos(
    call: grpc.ServerWritableStream<
      agent.ProviderSearchMessage,
      agent.IdentityInfoMessage
    >,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { providerKey, searchTermList } = call.request!.toObject();
      const provider = this.pk.providerManager.getProvider(providerKey);

      console.log('ehhhee');

      for await (const identityInfo of provider.getConnectedIdentityInfos(
        searchTermList,
      )) {
        console.log('ehhhee');
        const identityInfoMessage = new agent.IdentityInfoMessage();
        if (identityInfo.email) {
          identityInfoMessage.setEmail(identityInfo.email);
        }
        if (identityInfo.key) {
          identityInfoMessage.setKey(identityInfo.key);
        }
        if (identityInfo.name) {
          identityInfoMessage.setName(identityInfo.name);
        }
        if (identityInfo.provider) {
          identityInfoMessage.setProvider(identityInfo.provider);
        }
        if (identityInfo.url) {
          identityInfoMessage.setUrl(identityInfo.url);
        }
        call.write(identityInfoMessage);
      }
      call.end();
    } catch (error) {
      call.end();
    }
  }

  async getGestaltByIdentity(
    call: grpc.ServerUnaryCall<agent.IdentityMessage, agent.GestaltMessage>,
    callback: grpc.sendUnaryData<agent.GestaltMessage>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { providerKey, key } = call.request!.toObject();
      const gestalt = this.pk.gestaltGraph.getGestaltByIdentity(
        key,
        providerKey,
      );
      if (!gestalt) {
        throw Error('gestalt was not found');
      }
      const response = gestaltToProtobuf(gestalt);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getGestalts(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, agent.GestaltListMessage>,
    callback: grpc.sendUnaryData<agent.GestaltListMessage>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const gestaltList = this.pk.gestaltGraph.getGestalts();
      console.log(gestaltList);

      const gestaltListMessage = gestaltList.map((gestalt) =>
        gestaltToProtobuf(gestalt),
      );
      const response = new agent.GestaltListMessage();
      response.setGestaltMessageList(gestaltListMessage);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getOAuthClient(
    call: grpc.ServerUnaryCall<agent.EmptyMessage, agent.OAuthClientMessage>,
    callback: grpc.sendUnaryData<agent.OAuthClientMessage>,
  ) {
    this.refreshTimeout();
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
    this.refreshTimeout();
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
    call: grpc.ServerUnaryCall<agent.EmptyMessage, agent.PeerInfoMessage>,
    callback: grpc.sendUnaryData<agent.PeerInfoMessage>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const peerInfo = this.pk.peerManager.peerInfo;
      const response = new agent.PeerInfoMessage();
      response.setPeerId(peerInfo.id);
      response.setAlias(peerInfo.alias);
      response.setPublicKey(peerInfo.publicKey);
      response.setRootPublicKey(peerInfo.rootPublicKey);
      if (peerInfo.peerAddress) {
        response.setPeerAddress(peerInfo.peerAddress.toString());
      }
      if (peerInfo.apiAddress) {
        response.setApiAddress(peerInfo.apiAddress.toString());
      }
      response.setLinkInfoList(
        peerInfo.linkInfoList.map((l) => {
          const linkInfo = l as LinkInfoIdentity;
          const linkInfoMessage = new agent.LinkInfoIdentityMessage();
          linkInfoMessage.setDateissued(linkInfo.dateIssued);
          linkInfoMessage.setIdentity(linkInfo.identity);
          linkInfoMessage.setKey(linkInfo.key);
          linkInfoMessage.setNode(linkInfo.node);
          linkInfoMessage.setProvider(linkInfo.provider);
          linkInfoMessage.setSignature(linkInfo.signature);
          linkInfoMessage.setType(linkInfo.type);
          linkInfoMessage.setUrl(linkInfo.url ?? '');
          return linkInfoMessage;
        }),
      );

      const peerInfoPem = peerInfo.toX509Pem(
        this.pk.keyManager.getPrivateKey(),
      );
      response.setPem(peerInfoPem);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getPeerInfo(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.PeerInfoMessage>,
    callback: grpc.sendUnaryData<agent.PeerInfoMessage>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      const peerInfo = this.pk.peerManager.getPeer(s);
      if (!peerInfo) {
        throw Error('public key does not exist in peer store');
      }
      const response = new agent.PeerInfoMessage();
      response.setPeerId(peerInfo.id);
      response.setAlias(peerInfo.alias);
      response.setPublicKey(peerInfo.publicKey);
      response.setRootPublicKey(peerInfo.rootPublicKey);
      if (peerInfo.peerAddress) {
        response.setPeerAddress(peerInfo.peerAddress.toString());
      }
      if (peerInfo.apiAddress) {
        response.setApiAddress(peerInfo.apiAddress.toString());
      }
      response.setLinkInfoList(
        peerInfo.linkInfoList.map((l) => {
          const linkInfo = l as LinkInfoIdentity;
          const linkInfoMessage = new agent.LinkInfoIdentityMessage();
          linkInfoMessage.setDateissued(linkInfo.dateIssued);
          linkInfoMessage.setIdentity(linkInfo.identity);
          linkInfoMessage.setKey(linkInfo.key);
          linkInfoMessage.setNode(linkInfo.node);
          linkInfoMessage.setProvider(linkInfo.provider);
          linkInfoMessage.setSignature(linkInfo.signature);
          linkInfoMessage.setType(linkInfo.type);
          linkInfoMessage.setUrl(linkInfo.url ?? '');
          return linkInfoMessage;
        }),
      );
      response.setPem(peerInfo.pem);
      callback(null, response);
    } catch (error) {
      callback(error, null);
    }
  }

  async getPrimaryKeyPair(
    call: grpc.ServerUnaryCall<agent.BooleanMessage, agent.KeyPairMessage>,
    callback: grpc.sendUnaryData<agent.KeyPairMessage>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { b } = call.request!.toObject();
      const publicKey = this.pk.keyManager.getPublicKeyString();
      const privateKey = this.pk.keyManager.getKeyPair().encryptedPrivateKey;
      const response = new agent.KeyPairMessage();
      response.setPublicKey(publicKey);
      if (b) {
        response.setPrivateKey(privateKey!);
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
    this.refreshTimeout();
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
    this.refreshTimeout();
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
    this.refreshTimeout();
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
    this.refreshTimeout();
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
    this.refreshTimeout();
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
    this.refreshTimeout();
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
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const rootCert = this.pk.peerManager.pki.RootCertificatePem;
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
    this.refreshTimeout();
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
    this.refreshTimeout();
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
    this.refreshTimeout();
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
    this.refreshTimeout();
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
    call: grpc.ServerUnaryCall<
      agent.NewClientCertificateMessage,
      agent.NewClientCertificateMessage
    >,
    callback: grpc.sendUnaryData<agent.NewClientCertificateMessage>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { domain, certFile, keyFile } = call.request!.toObject();
      const pki = this.pk.peerManager.pki;
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
      const { passphrase, nbits } = call.request!.toObject();

      // check node is already initialized
      if (
        fs.existsSync(path.join(this.pk.polykeyPath, '.keys', 'private_key'))
      ) {
        throw Error(
          `polykey keypair already exists at node path: '${this.pk.polykeyPath}'`,
        );
      }

      const km = new KeyManager(this.pk.polykeyPath, fs);

      await km.generateKeyPair(passphrase, nbits, true);

      // stop old polykey and start new one to avoid conflicts of tcp/udp ports
      await this.pk.stopAllServices();
      this.pk = new Polykey(this.pk.polykeyPath, fs, km);

      // re-load all meta data
      await this.pk.keyManager.loadEncryptedMetadata();
      this.pk.peerManager.loadMetadata();
      await this.pk.vaultManager.loadEncryptedMetadata();

      // finally start all services
      await this.pk.startAllServices();

      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async newSecret(
    call: grpc.ServerUnaryCall<agent.SecretContentMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const {
        secretPath,
        secretFilePath,
        secretContent,
      } = call.request!.toObject();
      const vault = this.pk.vaultManager.getVault(secretPath!.vaultName);
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
        await vault.addSecret(secretPath!.secretName, secretBuffer);
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
    this.refreshTimeout();
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
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { publicKeyOrHandle, timeout } = call.request!.toObject();
      const successful = await this.pk.peerManager.pingPeer(
        publicKeyOrHandle,
        timeout,
      );
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
    this.refreshTimeout();
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
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { vaultName, newName } = call.request!.toObject();

      this.pk.vaultManager.renameVault(vaultName, newName);

      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async recoverKeynode(
    call: grpc.ServerUnaryCall<agent.RecoverKeynodeMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { mnemonic, userId, passphrase } = call.request!.toObject();

      await this.pk.keyManager.recoverKeynode(mnemonic, userId, passphrase);

      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async revokeOAuthToken(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.refreshTimeout();
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
    this.refreshTimeout();
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
    this.refreshTimeout();
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
    this.refreshTimeout();
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
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { filePath, privateKeyPath, passphrase } = call.request!.toObject();
      const signaturePath = await this.pk.keyManager.signFile(
        filePath,
        privateKeyPath,
        passphrase,
      );
      const response = new agent.StringMessage();
      response.setS(signaturePath);
      callback(null, response);
    } catch (error) {
      callback(error, null);
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
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { b } = call.request!.toObject();
      this.pk.peerManager.toggleStealthMode(b);
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async trustGestalt(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      this.pk.gestaltGraph.trust(s);
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async untrustGestalt(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      this.pk.gestaltGraph.untrust(s);
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async unsetAlias(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.refreshTimeout();
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
        await this.pk.keyManager.unlockKeypair(passphrase, timeout);
      }

      // re-load all meta data
      await this.pk.keyManager.loadEncryptedMetadata();
      this.pk.peerManager.loadMetadata();
      await this.pk.vaultManager.loadEncryptedMetadata();

      // finally start all services
      await this.pk.startAllServices();

      try {
        // TODO: remove this part after demo (to be replaced with real NAT traversal)
        // read in demo config
        const bootstrapPeerInfoPem = fs
          .readFileSync(path.join(os.homedir(), 'bootstrapPeerInfo.pem'))
          .toString();
        // add bootstrap nodes peerInfo
        const bootstrapPeerInfo = new PeerInfoReadOnly(bootstrapPeerInfoPem);
        if (this.pk.peerManager.hasPeer(bootstrapPeerInfo.id)) {
          this.pk.peerManager.updatePeer(bootstrapPeerInfo);
        } else {
          this.pk.peerManager.addPeer(bootstrapPeerInfo);
        }
      } catch (error) {
        // no throw
      }

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
    this.refreshTimeout();
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

  // this is probably a redundant method as most of the information managed
  // by local peer info is meant to be secure and managed only by the peer
  // not to mentioned it is a signed and verifiable source of truth.
  // the only thing that can be changed is the alias so this could
  // probably be replaced in future with a simple setLocalAlias RPC.
  async updateLocalPeerInfo(
    call: grpc.ServerUnaryCall<agent.PeerInfoMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const {
        peerId,
        alias,
        publicKey,
        rootPublicKey,
        peerAddress,
        apiAddress,
        linkInfoList,
        pem,
      } = call.request!.toObject();

      if (peerId) {
        throw Error('cannot modify peerId');
      }
      if (alias) {
        this.pk.peerManager.peerInfo.alias = alias;
      }
      if (publicKey) {
        throw Error('cannot modify publicKey, try recycling keypair instead');
      }
      if (rootPublicKey) {
        throw Error('cannot modify rootPublicKey');
      }
      if (peerAddress) {
        throw Error(
          'cannot modify peerAddress, try setting PK_PEER_HOST or PK_PEER_PORT env variables instead',
        );
      }
      if (apiAddress) {
        throw Error(
          'cannot modify peerAddress, try setting PK_API_HOST or PK_API_PORT env variables instead',
        );
      }
      if (linkInfoList) {
        throw Error(
          'cannot modify proofList, try using the social proof API instead',
        );
      }
      if (pem) {
        throw Error(
          'cannot modify peerInfo pem as it is signed and managed internally',
        );
      }

      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async updatePeerInfo(
    call: grpc.ServerUnaryCall<
      agent.PeerInfoReadOnlyMessage,
      agent.EmptyMessage
    >,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const {
        peerId,
        pem,
        unsignedAlias,
        unsignedPeerAddress,
        unsignedApiAddress,
      } = call.request!.toObject();
      let peerInfo: PeerInfoReadOnly | null;
      if (peerId) {
        peerInfo = this.pk.peerManager.getPeer(peerId);
      } else if (pem) {
        peerInfo = new PeerInfoReadOnly(pem);
      } else {
        throw Error('peerId or pem must be specified to  identify peer');
      }
      if (!peerInfo || !this.pk.peerManager.hasPeer(peerInfo.id)) {
        throw 'peer does not exist in store';
      }
      if (unsignedAlias) {
        peerInfo.alias = unsignedAlias;
      }
      if (unsignedPeerAddress) {
        peerInfo.peerAddress = Address.parse(unsignedPeerAddress);
      } else if (unsignedPeerAddress == '') {
        peerInfo.peerAddress = undefined;
      }
      if (unsignedApiAddress) {
        peerInfo.apiAddress = Address.parse(unsignedApiAddress);
      } else if (unsignedApiAddress == '') {
        peerInfo.apiAddress = undefined;
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
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const {
        secretPath,
        secretFilePath,
        secretContent,
      } = call.request!.toObject();
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
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { publicKeyPath, filePath } = call.request!.toObject();
      const verified = await this.pk.keyManager.verifyFile(
        filePath,
        publicKeyPath,
      );
      if (!verified) {
        throw Error('file could not be verified');
      }
      callback(null, new agent.EmptyMessage());
    } catch (error) {
      callback(error, null);
    }
  }

  async verifyMnemonic(
    call: grpc.ServerUnaryCall<agent.StringMessage, agent.EmptyMessage>,
    callback: grpc.sendUnaryData<agent.EmptyMessage>,
  ) {
    this.refreshTimeout();
    try {
      this.failOnLocked();
      const { s } = call.request!.toObject();
      const verified = await this.pk.keyManager.verifyMnemonic(s);
      if (!verified) {
        throw Error('mnemonic was incorrect');
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
      throw Error(
        `polykey agent is not started at polykey path: '${polykeyPath}'`,
      );
    } else {
      // get credentials
      const rootCredentials = PolykeyAgent.AgentRootCredentials(polykeyPath);
      const clientCredentials = PolykeyAgent.AgentClientCredentials(
        polykeyPath,
      );
      try {
        const client = new AgentClient(
          `localhost:${port}`,
          grpc.ChannelCredentials.createSsl(
            rootCredentials.cert,
            clientCredentials.keypair.private,
            clientCredentials.cert,
          ),
        );
        return client;
      } catch (error) {
        throw Error('agent is offline');
      }
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
  public static AgentSSLCredentialsExist(polykeyPath: string): boolean {
    const paths = PolykeyAgent.AgentSSLPaths(polykeyPath);
    return (
      fs.existsSync(paths.root.cert) &&
      fs.existsSync(paths.root.keypair.private) &&
      fs.existsSync(paths.root.keypair.public) &&
      fs.existsSync(paths.server.cert) &&
      fs.existsSync(paths.server.keypair.private) &&
      fs.existsSync(paths.server.keypair.public) &&
      fs.existsSync(paths.client.cert) &&
      fs.existsSync(paths.client.keypair.private) &&
      fs.existsSync(paths.client.keypair.public)
    );
  }
  public static AgentSSLPaths(polykeyPath: string) {
    const agentPKIPath = path.join(polykeyPath, '.agent', 'PKI');
    fs.mkdirSync(agentPKIPath, { recursive: true });
    return {
      root: {
        cert: path.join(agentPKIPath, 'root.crt'),
        keypair: {
          private: path.join(agentPKIPath, 'root-private.key'),
          public: path.join(agentPKIPath, 'root-public.key'),
        },
      },
      server: {
        cert: path.join(agentPKIPath, 'server.crt'),
        keypair: {
          private: path.join(agentPKIPath, 'server-private.key'),
          public: path.join(agentPKIPath, 'server-public.key'),
        },
      },
      client: {
        cert: path.join(agentPKIPath, 'client.crt'),
        keypair: {
          private: path.join(agentPKIPath, 'client-private.key'),
          public: path.join(agentPKIPath, 'client-public.key'),
        },
      },
    };
  }
  public static AgentRootCredentials(polykeyPath: string) {
    const paths = PolykeyAgent.AgentSSLPaths(polykeyPath);
    return {
      cert: fs.readFileSync(paths.root.cert),
      keypair: {
        private: fs.readFileSync(paths.root.keypair.private),
        public: fs.readFileSync(paths.root.keypair.public),
      },
    };
  }
  public static AgentClientCredentials(polykeyPath: string) {
    const paths = PolykeyAgent.AgentSSLPaths(polykeyPath);
    return {
      cert: fs.readFileSync(paths.client.cert),
      keypair: {
        private: fs.readFileSync(paths.client.keypair.private),
        public: fs.readFileSync(paths.client.keypair.public),
      },
    };
  }
  public static AgentServerCredentials(polykeyPath: string) {
    const paths = PolykeyAgent.AgentSSLPaths(polykeyPath);
    return {
      cert: fs.readFileSync(paths.server.cert),
      keypair: {
        private: fs.readFileSync(paths.server.keypair.private),
        public: fs.readFileSync(paths.server.keypair.public),
      },
    };
  }

  private static createAgentRootCredentials(): TLSCredentials {
    const certificate = pki.createCertificate();
    const keypair = pki.rsa.generateKeyPair();
    certificate.publicKey = keypair.publicKey;
    certificate.serialNumber = '01';
    certificate.validity.notBefore = new Date();
    certificate.validity.notAfter = new Date();
    certificate.validity.notAfter.setMonth(
      certificate.validity.notBefore.getMonth() + 3,
    );

    const attrs = [
      {
        name: 'commonName',
        value: 'localhost',
      },
      {
        name: 'organizationName',
        value: 'MatrixAI',
      },
    ];
    certificate.setSubject(attrs);
    certificate.setIssuer(attrs);
    certificate.setExtensions([
      {
        name: 'basicConstraints',
        cA: true,
      },
      {
        name: 'keyUsage',
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true,
      },
      {
        name: 'extKeyUsage',
        serverAuth: true,
        clientAuth: true,
        codeSigning: true,
        emailProtection: true,
        timeStamping: true,
      },
      {
        name: 'nsCertType',
        client: true,
        server: true,
        email: true,
        objsign: true,
        sslCA: true,
        emailCA: true,
        objCA: true,
      },
      {
        name: 'subjectKeyIdentifier',
      },
    ]);

    certificate.sign(keypair.privateKey, md.sha512.create());

    const certificatePem = pki.certificateToPem(certificate);

    return {
      rootCertificate: certificatePem,
      certificate: certificatePem,
      keypair: {
        private: pki.privateKeyToPem(keypair.privateKey),
        public: pki.publicKeyToPem(keypair.publicKey),
      },
    };
  }

  private static createAgentServerCredentials(
    rootCert: pki.Certificate,
    rootKey: pki.rsa.PrivateKey,
  ): TLSCredentials {
    const keypair = pki.rsa.generateKeyPair();
    // create a certification request (CSR)
    const certificate = pki.createCertificate();
    certificate.serialNumber = '01';
    certificate.validity.notBefore = new Date();
    certificate.validity.notAfter = new Date();
    certificate.validity.notAfter.setMonth(
      certificate.validity.notBefore.getMonth() + 3,
    );

    certificate.setSubject([
      {
        name: 'commonName',
        value: 'localhost',
      },
    ]);
    certificate.setIssuer(rootCert.issuer.attributes);
    certificate.publicKey = keypair.publicKey;

    certificate.setExtensions([
      {
        name: 'basicConstraints',
        cA: true,
      },
      {
        name: 'keyUsage',
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true,
      },
      {
        name: 'extKeyUsage',
        serverAuth: true,
        clientAuth: false,
        codeSigning: true,
        emailProtection: true,
        timeStamping: true,
      },
      {
        name: 'nsCertType',
        client: false,
        server: true,
        email: false,
        objsign: false,
        sslCA: false,
        emailCA: false,
        objCA: false,
      },
    ]);

    // sign certificate
    certificate.sign(rootKey, md.sha512.create());

    return {
      rootCertificate: pki.certificateToPem(rootCert),
      certificate: pki.certificateToPem(certificate),
      keypair: {
        private: pki.privateKeyToPem(keypair.privateKey),
        public: pki.publicKeyToPem(keypair.publicKey),
      },
    };
  }

  private static createAgentClientCredentials(
    rootCert: pki.Certificate,
    rootKey: pki.rsa.PrivateKey,
  ): TLSCredentials {
    const keypair = pki.rsa.generateKeyPair();
    // create a certification request (CSR)
    const certificate = pki.createCertificate();
    certificate.serialNumber = '01';
    certificate.validity.notBefore = new Date();
    certificate.validity.notAfter = new Date();
    certificate.validity.notAfter.setMonth(
      certificate.validity.notBefore.getMonth() + 3,
    );

    certificate.setSubject([
      {
        name: 'commonName',
        value: 'localhost',
      },
    ]);
    certificate.setIssuer(rootCert.issuer.attributes);
    certificate.publicKey = keypair.publicKey;

    certificate.setExtensions([
      {
        name: 'basicConstraints',
        cA: true,
      },
      {
        name: 'keyUsage',
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true,
      },
      {
        name: 'extKeyUsage',
        serverAuth: false,
        clientAuth: true,
        codeSigning: true,
        emailProtection: true,
        timeStamping: true,
      },
      {
        name: 'nsCertType',
        client: true,
        server: false,
        email: false,
        objsign: false,
        sslCA: false,
        emailCA: false,
        objCA: false,
      },
    ]);

    // sign certificate
    certificate.sign(rootKey, md.sha512.create());

    return {
      rootCertificate: pki.certificateToPem(rootCert),
      certificate: pki.certificateToPem(certificate),
      keypair: {
        private: pki.privateKeyToPem(keypair.privateKey),
        public: pki.publicKeyToPem(keypair.publicKey),
      },
    };
  }

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

  public static async startAgent(
    polykeyPath: string,
    background = false,
    failOnNotInitialized = true,
    isElectron = false,
  ): Promise<number> {
    // either resolves a newly started process ID or true if the process is running already
    return new Promise<number>(async (resolve, reject) => {
      try {
        if (
          failOnNotInitialized &&
          !fs.existsSync(path.join(polykeyPath, '.keys', 'private_key'))
        ) {
          throw Error(
            `polykey node has not been initialized, initialize with 'pk agent init'`,
          );
        }

        // check if agent is already running
        if (PolykeyAgent.AgentIsRunning(polykeyPath)) {
          // get the pid from the config
          const pid = PolykeyAgent.ConfigStore(polykeyPath).get('pid');
          resolve(pid);
        } else {
          if (background) {
            const logPath = path.join(polykeyPath, '.agent', 'log');

            if (fs.existsSync(logPath)) {
              fs.rmdirSync(logPath, { recursive: true });
            }
            fs.mkdirSync(logPath, { recursive: true });

            const options: SpawnOptions = {
              detached: background,
              stdio: [
                'ignore',
                fs.openSync(path.join(logPath, 'output.log'), 'a'),
                fs.openSync(path.join(logPath, 'error.log'), 'a'),
                'ipc',
              ],
            };
            try {
              options.uid = process.getuid();
            } catch {
              // no throw
            }

            let spawnPath: string;
            if (isElectron) {
              options.env = {
                ELECTRON_RUN_AS_NODE: '1',
              };
              spawnPath = process.execPath;
            } else {
              spawnPath = PolykeyAgent.DAEMON_SCRIPT_PATH.includes('.js')
                ? 'node'
                : 'ts-node';
            }

            const agentProcess = spawn(
              spawnPath,
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
                    reject(
                      'something went wrong, child process did not start polykey agent',
                    );
                  }
                });
              }
            });
          } else {
            const agent = new PolykeyAgent(polykeyPath);
            await agent.startServer();
            resolve(process.pid);
          }
        }
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default PolykeyAgent;
