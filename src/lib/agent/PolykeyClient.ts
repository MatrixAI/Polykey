import { agent } from '../../../proto/js/Agent';
import { Duplex } from 'readable-stream';
const {
  AgentMessage,
  AgentMessageType,
  CreateSecretRequestMessage,
  CreateSecretResponseMessage,
  DecryptFileRequestMessage,
  DecryptFileResponseMessage,
  DeleteKeyRequestMessage,
  DeleteKeyResponseMessage,
  DeriveKeyRequestMessage,
  DeriveKeyResponseMessage,
  DestroySecretRequestMessage,
  DestroySecretResponseMessage,
  DestroyVaultRequestMessage,
  DestroyVaultResponseMessage,
  EncryptFileRequestMessage,
  EncryptFileResponseMessage,
  ErrorMessage,
  GetPrimaryKeyPairRequestMessage,
  GetPrimaryKeyPairResponseMessage,
  GetSecretRequestMessage,
  GetSecretResponseMessage,
  GetKeyRequestMessage,
  GetKeyResponseMessage,
  ListKeysRequestMessage,
  ListKeysResponseMessage,
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
  UpdateSecretRequestMessage,
  UpdateSecretResponseMessage,
  VerifyFileRequestMessage,
  VerifyFileResponseMessage,
} = agent;

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
            responseList.push(...data)
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
    type: agent.AgentMessageType,
    nodePath?: string,
    request?: Uint8Array,
  ): Promise<agent.AgentMessage[]> {
    // Encode message and sent
    const agentMessage = AgentMessage.encode({
      type: type,
      isResponse: false,
      nodePath: nodePath,
      subMessage: request,
    }).finish();
    const responseList = await this.sendRequestToAgent(agentMessage);

    const agentMessageList: agent.AgentMessage[] = [];
    for (const response of responseList.values()) {
      const { subMessage, type } = AgentMessage.decode(response);
      if (type == AgentMessageType.ERROR) {
        const { error } = ErrorMessage.decode(subMessage);
        const reason = new Error(`Agent Error: ${error}`);
        throw reason;
      } else {
        agentMessageList.push(AgentMessage.decode(response));
      }
    }

    return agentMessageList;
  }

  async registerNode(path: string, passphrase: string) {
    const registerNodeRequest = RegisterNodeRequestMessage.encode({ passphrase }).finish();

    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.REGISTER_NODE, path, registerNodeRequest);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.REGISTER_NODE)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = RegisterNodeResponseMessage.decode(subMessage);

    return successful;
  }

  async newNode(path: string, name: string, email: string, passphrase: string, nbits?: number) {
    const newNodeRequest = NewNodeRequestMessage.encode({ name, email, passphrase, nbits }).finish();

    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.NEW_NODE, path, newNodeRequest);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.NEW_NODE)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = NewNodeResponseMessage.decode(subMessage);

    return successful;
  }

  async listNodes(unlockedOnly: boolean = true) {
    const newNodeRequest = ListNodesRequestMessage.encode({ unlockedOnly }).finish();

    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.LIST_NODES, undefined, newNodeRequest);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.LIST_NODES)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { nodes } = ListNodesResponseMessage.decode(subMessage);
    return nodes;
  }

  /////////////////////
  // Key commands //
  /////////////////////
  async deriveKey(nodePath: string, keyName: string, passphrase: string) {
    const request = DeriveKeyRequestMessage.encode({ keyName, passphrase }).finish();

    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.DERIVE_KEY, nodePath, request);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.DERIVE_KEY)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = DeriveKeyResponseMessage.decode(subMessage);
    return successful;
  }
  async deleteKey(nodePath: string, keyName: string) {
    const request = DeleteKeyRequestMessage.encode({ keyName }).finish();

    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.DELETE_KEY, nodePath, request);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.DELETE_KEY)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = DeleteKeyResponseMessage.decode(subMessage);
    return successful;
  }
  async listKeys(nodePath: string) {
    const request = ListKeysRequestMessage.encode({}).finish();

    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.LIST_KEYS, nodePath, request);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.LIST_KEYS)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { keyNames } = ListKeysResponseMessage.decode(subMessage);
    return keyNames;
  }
  async getKey(nodePath: string, keyName: string) {
    const request = GetKeyRequestMessage.encode({ keyName }).finish();

    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.GET_KEY, nodePath, request);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.GET_KEY)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { keyContent } = GetKeyResponseMessage.decode(subMessage);
    return keyContent;
  }
  async getPrimaryKeyPair(nodePath: string, includePrivateKey: boolean = false) {
    const request = GetPrimaryKeyPairRequestMessage.encode({ includePrivateKey }).finish();

    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.GET_PRIMARY_KEYPAIR, nodePath, request);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.GET_PRIMARY_KEYPAIR)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { publicKey, privateKey } = GetPrimaryKeyPairResponseMessage.decode(subMessage);
    return { publicKey, privateKey };
  }

  /////////////////////
  // Crypto commands //
  /////////////////////
  async signFile(nodePath: string, filePath: string, privateKeyPath?: string, passphrase?: string) {
    const request = SignFileRequestMessage.encode({ filePath, privateKeyPath, passphrase }).finish();

    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.SIGN_FILE, nodePath, request);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.SIGN_FILE)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { signaturePath } = SignFileResponseMessage.decode(subMessage);
    return signaturePath;
  }
  async verifyFile(nodePath: string, filePath: string, signaturePath?: string) {
    const request = VerifyFileRequestMessage.encode({ filePath, signaturePath }).finish();

    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.VERIFY_FILE, nodePath, request);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.VERIFY_FILE)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { verified } = VerifyFileResponseMessage.decode(subMessage);
    return verified;
  }
  async encryptFile(nodePath: string, filePath: string, publicKeyPath?: string) {
    const request = EncryptFileRequestMessage.encode({ filePath, publicKeyPath }).finish();

    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.ENCRYPT_FILE, nodePath, request);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.ENCRYPT_FILE)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { encryptedPath } = EncryptFileResponseMessage.decode(subMessage);
    return encryptedPath;
  }
  async decryptFile(nodePath: string, filePath: string, privateKeyPath?: string, passphrase?: string) {
    const request = DecryptFileRequestMessage.encode({ filePath, privateKeyPath, passphrase }).finish();

    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.DECRYPT_FILE, nodePath, request);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.DECRYPT_FILE)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { decryptedPath } = DecryptFileResponseMessage.decode(subMessage);
    return decryptedPath;
  }

  //////////////////////
  // Vault Operations //
  //////////////////////
  async listVaults(nodePath: string) {
    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.LIST_VAULTS, nodePath);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.LIST_VAULTS)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { vaultNames } = ListVaultsResponseMessage.decode(subMessage);
    return vaultNames;
  }
  async newVault(nodePath: string, vaultName: string) {
    const request = NewVaultRequestMessage.encode({ vaultName }).finish();

    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.NEW_VAULT, nodePath, request);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.NEW_VAULT)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = NewVaultResponseMessage.decode(subMessage);
    return successful;
  }
  async destroyVault(nodePath: string, vaultName: string) {
    const request = DestroyVaultRequestMessage.encode({ vaultName }).finish();

    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.DESTROY_VAULT, nodePath, request);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.DESTROY_VAULT)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = DestroyVaultResponseMessage.decode(subMessage);
    return successful;
  }

  ///////////////////////
  // Secret Operations //
  ///////////////////////
  async listSecrets(nodePath: string, vaultName: string) {
    const request = ListSecretsRequestMessage.encode({ vaultName }).finish();
    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.LIST_SECRETS, nodePath, request);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.LIST_SECRETS)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { secretNames } = ListSecretsResponseMessage.decode(subMessage);
    return secretNames;
  }
  async createSecret(nodePath: string, vaultName: string, secretName: string, secret: string | Buffer) {
    let request: Uint8Array
    if (typeof secret == 'string') {
      request = CreateSecretRequestMessage.encode({ vaultName, secretName, secretPath: secret }).finish();
    } else {
      request = CreateSecretRequestMessage.encode({ vaultName, secretName, secretContent: secret }).finish();
    }

    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.CREATE_SECRET, nodePath, request);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.CREATE_SECRET)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = CreateSecretResponseMessage.decode(subMessage);
    return successful;
  }
  async destroySecret(nodePath: string, vaultName: string, secretName: string) {
    const request = DestroySecretRequestMessage.encode({ vaultName, secretName }).finish();

    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.DESTROY_SECRET, nodePath, request);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.DESTROY_SECRET)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = DestroySecretResponseMessage.decode(subMessage);
    return successful;
  }
  async getSecret(nodePath: string, vaultName: string, secretName: string) {
    const request = GetSecretRequestMessage.encode({ vaultName, secretName }).finish();

    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.GET_SECRET, nodePath, request);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.GET_SECRET)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { secret } = GetSecretResponseMessage.decode(subMessage);
    return Buffer.from(secret);
  }
  async updateSecret(nodePath: string, vaultName: string, secretName: string, secret: string | Buffer) {
    let request: Uint8Array
    if (typeof secret == 'string') {
      request = UpdateSecretRequestMessage.encode({ vaultName, secretName, secretPath: secret }).finish();
    } else {
      request = UpdateSecretRequestMessage.encode({ vaultName, secretName, secretContent: secret }).finish();
    }

    const encodedResponse = await this.handleAgentCommunication(AgentMessageType.UPDATE_SECRET, nodePath, request);

    const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.UPDATE_SECRET)?.subMessage
    if (!subMessage) {
      throw Error('agent did not respond');
    }

    const { successful } = UpdateSecretResponseMessage.decode(subMessage);
    return successful;
  }

  ///////////////////
  // Agent control //
  ///////////////////
  async getAgentStatus(): Promise<string> {
    try {
      const encodedResponse = await this.handleAgentCommunication(AgentMessageType.STATUS);

      const subMessage = encodedResponse.find((r) => r.type == AgentMessageType.STATUS)?.subMessage
      if (!subMessage) {
        throw Error('agent did not respond');
      }

      const status = Buffer.from(subMessage).toString();
      return status;
    } catch (err) {
      if ((<Error>err).toString().match(/ECONNRESET|ENOENT|ECONNRESET/)) {
        return 'stopped';
      }
      throw err
    }
  }
  async stopAgent(): Promise<boolean> {
    try {
      // Tell it to start shutting and wait for response
      await this.handleAgentCommunication(AgentMessageType.STOP_AGENT);
      return true;
    } catch (err) {
      return (await this.getAgentStatus()) != 'online';
    }
  }
}

export default PolykeyClient;
