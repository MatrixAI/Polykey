import * as grpc from '@grpc/grpc-js';
import { Address } from '../peers/PeerInfo';
import KeyManager from '../keys/KeyManager';
import { GitServerClient } from '../../../proto/compiled/Git_grpc_pb';
import { InfoRequest, PackRequest } from '../../../proto/compiled/Git_pb';

/**
 * Responsible for converting HTTP messages from isomorphic-git into requests and sending them to a specific peer.
 */
class GitFrontend {
  private client: GitServerClient;
  private credentials: grpc.ChannelCredentials;

  constructor(address: Address, keyManager: KeyManager) {
    const pkiInfo = keyManager.PKIInfo;
    if (pkiInfo.caCert && pkiInfo.cert && pkiInfo.key) {
      this.credentials = grpc.credentials.createSsl(pkiInfo.caCert, pkiInfo.key, pkiInfo.cert);
    } else {
      this.credentials = grpc.credentials.createInsecure();
    }
    this.client = new GitServerClient(address.toString(), this.credentials);
  }

  /**
   * Requests remote info from the connected peer for the named vault.
   * @param vaultName Name of the desired vault
   */
  async requestInfo(vaultName: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const request = new InfoRequest();
      request.setVaultname(vaultName);
      this.client.requestInfo(request, function (err, response) {
        if (err) {
          reject(err);
        } else {
          resolve(Buffer.from(response.getBody_asB64(), 'base64'));
        }
      });
    });
  }

  /**
   * Requests a pack from the connected peer for the named vault.
   * @param vaultName Name of the desired vault
   */
  async requestPack(vaultName: string, body: Uint8Array): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const request = new PackRequest();
      request.setVaultname(vaultName);
      request.setBody(body);
      this.client.requestPack(request, function (err, response) {
        if (err) {
          reject(err);
        } else {
          resolve(Buffer.from(response.getBody_asB64(), 'base64'));
        }
      });
    });
  }
}

export default GitFrontend;
