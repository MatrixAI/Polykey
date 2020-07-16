import * as grpc from '@grpc/grpc-js';
import { Address } from '../peers/PeerInfo';
import KeyManager from '../keys/KeyManager';
import { GitServerClient } from '../../../proto/compiled/Git_grpc_pb';
import { InfoRequest, PackRequest } from '../../../proto/compiled/Git_pb';

/**
 * Responsible for converting HTTP messages from isomorphic-git into requests and sending them to a specific peer.
 */
class GitClient {
  private client: GitServerClient
  private credentials: grpc.ChannelCredentials

  constructor(
    address: Address,
    keyManager: KeyManager
  ) {
    // const pkiInfo = keyManager.PKIInfo
    // if (pkiInfo.caCert && pkiInfo.cert && pkiInfo.key) {
    //   this.credentials = grpc.credentials.createSsl(
    //     pkiInfo.caCert,
    //     pkiInfo.key,
    //     pkiInfo.cert,
    //   )
    // } else {
      this.credentials = grpc.credentials.createInsecure()
    // }
    this.client = new GitServerClient(address.toString(), this.credentials)
  }

  /**
   * The custom http request method to feed into isomorphic-git's [custom http object](https://isomorphic-git.org/docs/en/http)
   */
  async request({
    url,
    method,
    headers,
    body,
    onProgress
  }) {
    return new Promise<any>(async (resolve, reject) => {
      const u = new URL(url)

      // Parse request
      if (method == 'GET') {
        // Info request
        const match = u.pathname.match(/\/(.+)\/info\/refs$/)
        if (!match || /\.\./.test(match[1])) {
          reject(new Error('Error'))
        }

        const vaultName = match![1]

        const infoResponse = await this.requestInfo(vaultName)

        resolve({
          url: url,
          method: method,
          statusCode: 200,
          statusMessage: 'OK',
          body: this.iteratorFromData(infoResponse),
          headers: headers
        })
      } else if (method == 'POST') {
        // Info request
        const match = u.pathname.match(/\/(.+)\/git-(.+)/)
        if (!match || /\.\./.test(match[1])) {
          reject(new Error('Error'))
        }

        const vaultName = match![1]

        const packResponse = await this.requestPack(vaultName, body[0])

        resolve({
          url: url,
          method: method,
          statusCode: 200,
          statusMessage: 'OK',
          body: this.iteratorFromData(packResponse),
          headers: headers
        })
      } else {
        reject(new Error('Method not supported'))
      }
    })
  }

  // ==== HELPER METHODS ==== //
  /**
   * Requests remote info from the connected peer for the named vault.
   * @param vaultName Name of the desired vault
   */
  private async requestInfo(vaultName: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const request = new InfoRequest()
      request.setVaultname(vaultName)
      this.client.requestInfo(request, function (err, response) {
        if (err) {
          reject(err)
        } else {
          resolve(Buffer.from(response.getBody_asB64(), 'base64'));
        }
      });
    })
  }

  /**
   * Requests a pack from the connected peer for the named vault.
   * @param vaultName Name of the desired vault
   */
  private async requestPack(vaultName: string, body: Uint8Array): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const request = new PackRequest
      request.setVaultname(vaultName)
      request.setBody(body)
      this.client.requestPack(request, function (err, response) {
        if (err) {
          reject(err)
        } else {
          resolve(Buffer.from(response.getBody_asB64(), 'base64'));
        }
      });
    })
  }

  /**
   * Converts a buffer into an iterator expected by isomorphic git.
   * @param data Data to be turned into an iterator
   */
  private iteratorFromData(data: Uint8Array) {
    let ended = false
    return {
      next(): Promise<any> {
        return new Promise((resolve, reject) => {
          if (ended) {
            return resolve({ done: true })
          } else {
            ended = true
            resolve({ value: data, done: false })
          }
        })
      },
    }
  }
}

export default GitClient
