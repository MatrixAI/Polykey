import { Duplex } from 'readable-stream';
import PeerInfo, { Address } from '../peers/PeerInfo';
import { agentInterface } from '../../proto/js/Agent';

class PolykeyClient {
  private getStream: () => Duplex;

  constructor(getStream: () => Duplex) {
    this.getStream = getStream;
  }

  async sendRequestToAgent(request: Uint8Array): Promise<Uint8Array[]> {
    const stream = this.getStream();

    const responseList = await new Promise<Uint8Array[]>((resolve, reject) => {
      try {
        const responseList: Uint8Array[] = [];
        stream.on('data', (data: Uint8Array | Uint8Array[]) => {
          if (data instanceof Uint8Array) {
            responseList.push(data);
          } else {
            responseList.push(...data);
          }
        });
        stream.on('error', (err) => {
          reject(err);
        });
        stream.on('end', () => {
          resolve(responseList);
        });

        if (!stream.writableEnded) {
          stream.write(request);
        }
      } catch (err) {
        reject(err);
      }
    });
    return responseList;
  }

  private async handleAgentCommunication(
    type: agentInterface.AgentMessageType,
    nodePath?: string,
    request?: Uint8Array,
  ): Promise<agentInterface.AgentMessage[]> {
    // Encode message and sent
    const agentMessage = agentInterface.AgentMessage.encodeDelimited({
      type: type,
      isResponse: false,
      nodePath: nodePath,
      subMessage: request,
    }).finish();
    const responseList = await this.sendRequestToAgent(agentMessage);

    const agentMessageList: agentInterface.AgentMessage[] = [];
    for (const response of responseList.values()) {
      const { subMessage, type } = agentInterface.AgentMessage.decodeDelimited(response);
      if (type == agentInterface.AgentMessageType.ERROR) {
        const { error } = agentInterface.ErrorMessage.decodeDelimited(subMessage);
        const reason = new Error(`Agent Error: ${error}`);
        throw reason;
      } else {
        agentMessageList.push(agentInterface.AgentMessage.decodeDelimited(response));
      }
    }

    return agentMessageList;
  }

  async registerNode(path: string, passphrase: string) {
    const registerNodeRequest = agentInterface.RegisterNodeRequestMessage.encodeDelimited({ passphrase }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.REGISTER_NODE,
      path,
      registerNodeRequest,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.REGISTER_NODE)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = agentInterface.RegisterNodeResponseMessage.decodeDelimited(subMessage);

    return successful;
  }

  async newNode(path: string, userId: string, passphrase: string, nbits?: number) {
    const newNodeRequest = agentInterface.NewNodeRequestMessage.encodeDelimited({
      userId,
      passphrase,
      nbits,
    }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.NEW_NODE,
      path,
      newNodeRequest,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.NEW_NODE)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = agentInterface.NewNodeResponseMessage.decodeDelimited(subMessage);

    return successful;
  }

  async listNodes(unlockedOnly: boolean = true) {
    const newNodeRequest = agentInterface.ListNodesRequestMessage.encodeDelimited({ unlockedOnly }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.LIST_NODES,
      undefined,
      newNodeRequest,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.LIST_NODES)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { nodes } = agentInterface.ListNodesResponseMessage.decodeDelimited(subMessage);
    return nodes;
  }

  /////////////////////
  // Key commands //
  /////////////////////
  async deriveKey(nodePath: string, keyName: string, passphrase: string) {
    const request = agentInterface.DeriveKeyRequestMessage.encodeDelimited({ keyName, passphrase }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.DERIVE_KEY,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.DERIVE_KEY)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = agentInterface.DeriveKeyResponseMessage.decodeDelimited(subMessage);
    return successful;
  }

  async deleteKey(nodePath: string, keyName: string) {
    const request = agentInterface.DeleteKeyRequestMessage.encodeDelimited({ keyName }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.DELETE_KEY,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.DELETE_KEY)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = agentInterface.DeleteKeyResponseMessage.decodeDelimited(subMessage);
    return successful;
  }

  async listKeys(nodePath: string) {
    const request = agentInterface.ListKeysRequestMessage.encodeDelimited({}).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.LIST_KEYS,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.LIST_KEYS)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { keyNames } = agentInterface.ListKeysResponseMessage.decodeDelimited(subMessage);
    return keyNames;
  }

  async getKey(nodePath: string, keyName: string) {
    const request = agentInterface.GetKeyRequestMessage.encodeDelimited({ keyName }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.GET_KEY,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.GET_KEY)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { keyContent } = agentInterface.GetKeyResponseMessage.decodeDelimited(subMessage);
    return keyContent;
  }

  async getPrimaryKeyPair(nodePath: string, includePrivateKey: boolean = false) {
    const request = agentInterface.GetPrimaryKeyPairRequestMessage.encodeDelimited({ includePrivateKey }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.GET_PRIMARY_KEYPAIR,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.GET_PRIMARY_KEYPAIR)
      ?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { publicKey, privateKey } = agentInterface.GetPrimaryKeyPairResponseMessage.decodeDelimited(subMessage);
    return { publicKey, privateKey };
  }

  /////////////////////
  // Crypto commands //
  /////////////////////
  async signFile(nodePath: string, filePath: string, privateKeyPath?: string, passphrase?: string) {
    const request = agentInterface.SignFileRequestMessage.encodeDelimited({
      filePath,
      privateKeyPath,
      passphrase,
    }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.SIGN_FILE,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.SIGN_FILE)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { signaturePath } = agentInterface.SignFileResponseMessage.decodeDelimited(subMessage);
    return signaturePath;
  }

  async verifyFile(nodePath: string, filePath: string, publicKeyPath?: string) {
    const request = agentInterface.VerifyFileRequestMessage.encodeDelimited({ filePath, publicKeyPath }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.VERIFY_FILE,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.VERIFY_FILE)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { verified } = agentInterface.VerifyFileResponseMessage.decodeDelimited(subMessage);
    return verified;
  }

  async encryptFile(nodePath: string, filePath: string, publicKeyPath?: string) {
    const request = agentInterface.EncryptFileRequestMessage.encodeDelimited({ filePath, publicKeyPath }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.ENCRYPT_FILE,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.ENCRYPT_FILE)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { encryptedPath } = agentInterface.EncryptFileResponseMessage.decodeDelimited(subMessage);
    return encryptedPath;
  }

  async decryptFile(nodePath: string, filePath: string, privateKeyPath?: string, passphrase?: string) {
    const request = agentInterface.DecryptFileRequestMessage.encodeDelimited({
      filePath,
      privateKeyPath,
      passphrase,
    }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.DECRYPT_FILE,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.DECRYPT_FILE)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { decryptedPath } = agentInterface.DecryptFileResponseMessage.decodeDelimited(subMessage);
    return decryptedPath;
  }

  //////////////////////
  // Vault Operations //
  //////////////////////
  async listVaults(nodePath: string) {
    const encodedResponse = await this.handleAgentCommunication(agentInterface.AgentMessageType.LIST_VAULTS, nodePath);

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.LIST_VAULTS)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { vaultNames } = agentInterface.ListVaultsResponseMessage.decodeDelimited(subMessage);
    return vaultNames;
  }

  async scanVaultNames(nodePath: string, publicKey: string) {
    const request = agentInterface.ScanVaultNamesRequestMessage.encodeDelimited({ publicKey }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.SCAN_VAULT_NAMES,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.SCAN_VAULT_NAMES)
      ?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { vaultNames } = agentInterface.ScanVaultNamesResponseMessage.decodeDelimited(subMessage);
    return vaultNames;
  }

  async newVault(nodePath: string, vaultName: string) {
    const request = agentInterface.NewVaultRequestMessage.encodeDelimited({ vaultName }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.NEW_VAULT,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.NEW_VAULT)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = agentInterface.NewVaultResponseMessage.decodeDelimited(subMessage);
    return successful;
  }

  async pullVault(nodePath: string, vaultName: string, publicKey: string) {
    const request = agentInterface.PullVaultRequestMessage.encodeDelimited({ vaultName, publicKey }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.PULL_VAULT,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.PULL_VAULT)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = agentInterface.PullVaultResponseMessage.decodeDelimited(subMessage);
    return successful;
  }

  async destroyVault(nodePath: string, vaultName: string) {
    const request = agentInterface.DestroyVaultRequestMessage.encodeDelimited({ vaultName }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.DESTROY_VAULT,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.DESTROY_VAULT)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = agentInterface.DestroyVaultResponseMessage.decodeDelimited(subMessage);
    return successful;
  }

  ///////////////////////
  // Secret Operations //
  ///////////////////////
  async listSecrets(nodePath: string, vaultName: string) {
    const request = agentInterface.ListSecretsRequestMessage.encodeDelimited({ vaultName }).finish();
    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.LIST_SECRETS,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.LIST_SECRETS)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { secretNames } = agentInterface.ListSecretsResponseMessage.decodeDelimited(subMessage);
    return secretNames;
  }

  async createSecret(nodePath: string, vaultName: string, secretName: string, secret: string | Buffer) {
    let request: Uint8Array;
    if (typeof secret == 'string') {
      request = agentInterface.CreateSecretRequestMessage.encodeDelimited({
        vaultName,
        secretName,
        secretPath: secret,
      }).finish();
    } else {
      request = agentInterface.CreateSecretRequestMessage.encodeDelimited({
        vaultName,
        secretName,
        secretContent: secret,
      }).finish();
    }

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.CREATE_SECRET,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.CREATE_SECRET)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = agentInterface.CreateSecretResponseMessage.decodeDelimited(subMessage);
    return successful;
  }

  async destroySecret(nodePath: string, vaultName: string, secretName: string) {
    const request = agentInterface.DestroySecretRequestMessage.encodeDelimited({ vaultName, secretName }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.DESTROY_SECRET,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.DESTROY_SECRET)
      ?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = agentInterface.DestroySecretResponseMessage.decodeDelimited(subMessage);
    return successful;
  }

  async getSecret(nodePath: string, vaultName: string, secretName: string) {
    const request = agentInterface.GetSecretRequestMessage.encodeDelimited({ vaultName, secretName }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.GET_SECRET,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.GET_SECRET)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { secret } = agentInterface.GetSecretResponseMessage.decodeDelimited(subMessage);
    return Buffer.from(secret);
  }

  async updateSecret(nodePath: string, vaultName: string, secretName: string, secret: string | Buffer) {
    let request: Uint8Array;
    if (typeof secret == 'string') {
      request = agentInterface.UpdateSecretRequestMessage.encodeDelimited({
        vaultName,
        secretName,
        secretPath: secret,
      }).finish();
    } else {
      request = agentInterface.UpdateSecretRequestMessage.encodeDelimited({
        vaultName,
        secretName,
        secretContent: secret,
      }).finish();
    }

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.UPDATE_SECRET,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.UPDATE_SECRET)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = agentInterface.UpdateSecretResponseMessage.decodeDelimited(subMessage);
    return successful;
  }

  /////////////////////
  // Peer Operations //
  /////////////////////
  async addPeer(nodePath: string, publicKey?: string, peerAddress?: string, relayPublicKey?: string) {
    const request = agentInterface.AddPeerRequestMessage.encodeDelimited({
      publicKey,
      peerAddress,
      relayPublicKey,
    }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.ADD_PEER,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.ADD_PEER)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = agentInterface.AddPeerResponseMessage.decodeDelimited(subMessage);
    return successful;
  }

  async getPeerInfo(nodePath: string, current: boolean = false, publicKey?: string): Promise<PeerInfo> {
    const request = agentInterface.PeerInfoRequestMessage.encodeDelimited({ current, publicKey }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.GET_PEER_INFO,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.GET_PEER_INFO)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const {
      publicKey: responsePublicKey,
      peerAddress,
      relayPublicKey,
    } = agentInterface.PeerInfoResponseMessage.decodeDelimited(subMessage);
    return new PeerInfo(responsePublicKey, peerAddress, relayPublicKey);
  }

  async pingPeer(nodePath: string, publicKey: string, timeout?: number): Promise<boolean> {
    const request = agentInterface.PingPeerRequestMessage.encodeDelimited({ publicKey, timeout }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.PING_PEER,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.PING_PEER)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = agentInterface.PingPeerResponseMessage.decodeDelimited(subMessage);
    return successful;
  }

  async findPeer(nodePath: string, publicKey: string, timeout?: number): Promise<boolean> {
    const request = agentInterface.FindPeerRequestMessage.encodeDelimited({ publicKey, timeout }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.FIND_PEER,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.FIND_PEER)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = agentInterface.FindPeerResponseMessage.decodeDelimited(subMessage);
    return successful;
  }

  async findSocialPeer(nodePath: string, handle: string, service: string, timeout?: number): Promise<boolean> {
    const request = agentInterface.FindSocialPeerRequestMessage.encodeDelimited({ handle, service, timeout }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.FIND_SOCIAL_PEER,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.FIND_SOCIAL_PEER)
      ?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = agentInterface.FindSocialPeerResponseMessage.decodeDelimited(subMessage);
    return successful;
  }

  async listPeers(nodePath: string): Promise<string[]> {
    const request = agentInterface.ListPeersRequestMessage.encodeDelimited({}).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.LIST_PEERS,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.LIST_PEERS)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { publicKeys } = agentInterface.ListPeersResponseMessage.decodeDelimited(subMessage);
    return publicKeys;
  }

  async toggleStealth(nodePath: string, active: boolean): Promise<boolean> {
    const request = agentInterface.ToggleStealthRequestMessage.encodeDelimited({ active }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.TOGGLE_STEALTH,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.TOGGLE_STEALTH)
      ?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = agentInterface.ToggleStealthResponseMessage.decodeDelimited(subMessage);
    return successful;
  }

  async updatePeer(
    nodePath: string,
    publicKey?: string,
    currentNode?: boolean,
    peerHost?: string,
    peerPort?: number,
    relayPublicKey?: string,
  ): Promise<boolean> {
    const request = agentInterface.UpdatePeerInfoRequestMessage.encodeDelimited({
      publicKey,
      currentNode,
      peerHost,
      peerPort,
      relayPublicKey,
    }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.UPDATE_PEER_INFO,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.UPDATE_PEER_INFO)
      ?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = agentInterface.UpdatePeerInfoResponseMessage.decodeDelimited(subMessage);
    return successful;
  }

  async requestRelay(nodePath: string, publicKey: string): Promise<boolean> {
    const request = agentInterface.RequestRelayRequestMessage.encodeDelimited({ publicKey }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.REQUEST_RELAY,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.REQUEST_RELAY)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = agentInterface.RequestRelayResponseMessage.decodeDelimited(subMessage);
    return successful;
  }

  async requestPunch(nodePath: string, publicKey: string): Promise<Address> {
    const request = agentInterface.RequestPunchRequestMessage.encodeDelimited({ publicKey }).finish();

    const encodedResponse = await this.handleAgentCommunication(
      agentInterface.AgentMessageType.REQUEST_PUNCH,
      nodePath,
      request,
    );

    const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.REQUEST_PUNCH)?.subMessage;
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { address } = agentInterface.RequestPunchResponseMessage.decodeDelimited(subMessage);
    return Address.parse(address);
  }

  ///////////////////
  // Agent control //
  ///////////////////
  async getAgentStatus(): Promise<agentInterface.AgentStatusType> {
    try {
      const encodedResponse = await this.handleAgentCommunication(agentInterface.AgentMessageType.STATUS);

      const subMessage = encodedResponse.find((r) => r.type == agentInterface.AgentMessageType.STATUS)?.subMessage;
      if (!subMessage) {
        throw Error('agent did not respond');
      }

      const { status } = agentInterface.AgentStatusResponseMessage.decodeDelimited(subMessage);
      return status;
    } catch (err) {
      if ((<Error>err).toString().match(/ECONNRESET|ENOENT|ECONNRESET/)) {
        return agentInterface.AgentStatusType.OFFLINE;
      }
      throw err;
    }
  }

  async stopAgent(): Promise<boolean> {
    try {
      // Tell it to start shutting and wait for response
      await this.handleAgentCommunication(agentInterface.AgentMessageType.STOP_AGENT);
      return true;
    } catch (err) {
      return (await this.getAgentStatus()) != agentInterface.AgentStatusType.ONLINE;
    }
  }
}

export default PolykeyClient;
