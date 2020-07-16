import { agent } from '../../../proto/js/Agent';
import { PassThrough } from 'readable-stream'
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
  VerifyFileResponseMessage
} = agent

class PolykeyClient {
  private getStream: () => PassThrough

  constructor(getStream: () => PassThrough) {
    this.getStream = getStream
  }

  async sendRequestToAgent(request: Uint8Array): Promise<Uint8Array[]> {
    const stream = this.getStream()
    const responseList = await new Promise<Uint8Array[]>((resolve, reject) => {
      try {
        const responseList: Uint8Array[] = []
        stream.on('data', (data: Uint8Array) => {
          responseList.push(data)
        })
        stream.on('error', (err) => {
          reject(err)
        })
        stream.on('end', () => {
          resolve(responseList)
        })

        stream.write(request)
      } catch (err) {
        reject(err)
      }
    })
    stream.end()
    return responseList
  }

  private async handleAgentCommunication(
    type: agent.Type,
    nodePath?: string,
    request?: Uint8Array
  ): Promise<agent.AgentMessage[]> {
    // Encode message and sent
    const agentMessage = AgentMessage.encode({ type: type, isResponse: false, nodePath: nodePath, subMessage: request }).finish()
    const responseList = await this.sendRequestToAgent(agentMessage)
    const agentMessageList: agent.AgentMessage[] = []
    for (const response of responseList) {
      const { subMessage, type } = AgentMessage.decode(response)
      if (type == Type.ERROR) {
        const { error } = ErrorMessage.decode(subMessage)
        const reason = new Error(error)
        throw reason
      } else {
        agentMessageList.push(AgentMessage.decode(response))
      }
    }

    return agentMessageList
  }

  async registerNode(
    path: string,
    passphrase: string
  ) {
    const registerNodeRequest = RegisterNodeRequestMessage.encode({ passphrase }).finish()

    const encodedResponse = await this.handleAgentCommunication(Type.REGISTER_NODE, path, registerNodeRequest)
    if (encodedResponse.length == 0) {
      throw Error('agent did not respond')
    }

    const { successful } = RegisterNodeResponseMessage.decode(encodedResponse[0].subMessage)

    return successful
  }

  async newNode(
    path: string,
    name: string,
    email: string,
    passphrase: string,
    nbits?: number
  ) {
    const newNodeRequest = NewNodeRequestMessage.encode({ name, email, passphrase, nbits }).finish()

    const encodedResponse = await this.handleAgentCommunication(Type.NEW_NODE, path, newNodeRequest)
    if (encodedResponse.length == 0) {
      throw Error('agent did not respond')
    }

    const { successful } = NewNodeResponseMessage.decode(encodedResponse[0].subMessage)

    return successful
  }

  async listNodes(
    unlockedOnly: boolean = true
  ) {
    const newNodeRequest = ListNodesRequestMessage.encode({ unlockedOnly }).finish()

    const encodedResponse = await this.handleAgentCommunication(Type.LIST_NODES, undefined, newNodeRequest)
    if (encodedResponse.length == 0) {
      throw Error('agent did not respond')
    }

    const { nodes } = ListNodesResponseMessage.decode(encodedResponse[0].subMessage)
    return nodes
  }

  /////////////////////
  // Crypto commands //
  /////////////////////
  async deriveKey(nodePath: string, keyName: string, passphrase: string) {
    const request = DeriveKeyRequestMessage.encode({ keyName, passphrase }).finish()

    const encodedResponse = await this.handleAgentCommunication(Type.DERIVE_KEY, nodePath, request)
    if (encodedResponse.length == 0) {
      throw Error('agent did not respond')
    }

    const { successful } = DeriveKeyResponseMessage.decode(encodedResponse[0].subMessage)
    return successful
  }

  /////////////////////
  // Crypto commands //
  /////////////////////
  async signFile(
    nodePath: string,
    filePath: string,
    privateKeyPath?: string,
    passphrase?: string
  ) {
    const request = SignFileRequestMessage.encode({ filePath, privateKeyPath, passphrase }).finish()

    const encodedResponse = await this.handleAgentCommunication(Type.SIGN_FILE, nodePath, request)
    if (encodedResponse.length == 0) {
      throw Error('agent did not respond')
    }

    const { signaturePath } = SignFileResponseMessage.decode(encodedResponse[0].subMessage)
    return signaturePath
  }
  async verifyFile(
    nodePath: string,
    filePath: string,
    signaturePath?: string
  ) {
    const request = VerifyFileRequestMessage.encode({ filePath, signaturePath }).finish()

    const encodedResponse = await this.handleAgentCommunication(Type.VERIFY_FILE, nodePath, request)
    if (encodedResponse.length == 0) {
      throw Error('agent did not respond')
    }

    const { verified } = VerifyFileResponseMessage.decode(encodedResponse[0].subMessage)
    return verified
  }

  //////////////////////
  // Vault Operations //
  //////////////////////
  async listVaults(nodePath: string) {
    const encodedResponse = await this.handleAgentCommunication(Type.LIST_VAULTS, nodePath)
    if (encodedResponse.length == 0) {
      throw Error('agent did not respond')
    }

    const { vaultNames } = ListVaultsResponseMessage.decode(encodedResponse[0].subMessage)
    return vaultNames
  }
  async newVault(nodePath: string, vaultName: string) {
    const request = NewVaultRequestMessage.encode({ vaultName }).finish()

    const encodedResponse = await this.handleAgentCommunication(Type.NEW_VAULT, nodePath, request)
    if (encodedResponse.length == 0) {
      throw Error('agent did not respond')
    }

    const { successful } = NewVaultResponseMessage.decode(encodedResponse[0].subMessage)
    return successful
  }
  async destroyVault(nodePath: string, vaultName: string) {
    const request = DestroyVaultRequestMessage.encode({ vaultName }).finish()

    const encodedResponse = await this.handleAgentCommunication(Type.DESTROY_VAULT, nodePath, request)
    if (encodedResponse.length == 0) {
      throw Error('agent did not respond')
    }

    const { successful } = DestroyVaultResponseMessage.decode(encodedResponse[0].subMessage)
    return successful
  }

  ///////////////////////
  // Secret Operations //
  ///////////////////////
  async listSecrets(nodePath: string, vaultName: string) {
    const request = ListSecretsRequestMessage.encode({ vaultName }).finish()
    const encodedResponse = await this.handleAgentCommunication(Type.LIST_SECRETS, nodePath, request)
    if (encodedResponse.length == 0) {
      throw Error('agent did not respond')
    }

    const { secretNames } = ListSecretsResponseMessage.decode(encodedResponse[0].subMessage)
    return secretNames
  }
  async createSecret(nodePath: string, vaultName: string, secretName: string, secretPath: string) {
    const request = CreateSecretRequestMessage.encode({ vaultName, secretName, secretPath }).finish()

    const encodedResponse = await this.handleAgentCommunication(Type.CREATE_SECRET, nodePath, request)
    if (encodedResponse.length == 0) {
      throw Error('agent did not respond')
    }

    const { successful } = CreateSecretResponseMessage.decode(encodedResponse[0].subMessage)
    return successful
  }
  async destroySecret(nodePath: string, vaultName: string, secretName: string) {
    const request = DestroySecretRequestMessage.encode({ vaultName, secretName }).finish()

    const encodedResponse = await this.handleAgentCommunication(Type.DESTROY_SECRET, nodePath, request)
    if (encodedResponse.length == 0) {
      throw Error('agent did not respond')
    }

    const { successful } = DestroySecretResponseMessage.decode(encodedResponse[0].subMessage)
    return successful
  }
  async getSecret(nodePath: string, vaultName: string, secretName: string) {
    const request = GetSecretRequestMessage.encode({ vaultName, secretName }).finish()

    const encodedResponse = await this.handleAgentCommunication(Type.GET_SECRET, nodePath, request)
    if (encodedResponse.length == 0) {
      throw Error('agent did not respond')
    }

    const { secret } = GetSecretResponseMessage.decode(encodedResponse[0].subMessage)
    return Buffer.from(secret)
  }

  ///////////////////
  // Agent control //
  ///////////////////
  async getAgentStatus(): Promise<string> {
    try {
      const encodedResponse = await this.handleAgentCommunication(Type.STATUS)

      if (encodedResponse.length == 0) {
        throw Error('agent did not respond')
      }

      const status = encodedResponse[0].subMessage.toString()
      return status
    } catch (err) {
      return 'stopped'
    }
  }
  async stopAgent(): Promise<boolean> {
    try {
      // Tell it to start shutting and wait for response
      await this.handleAgentCommunication(Type.STOP_AGENT)
      return true
    } catch (err) {
      return (await this.getAgentStatus() != 'online')
    }
  }
}

export default PolykeyClient
