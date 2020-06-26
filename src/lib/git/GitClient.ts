import grpc from 'grpc';
import { Address } from '@polykey/peers/PeerInfo';
import createX509Certificate from '@polykey/pki/PublicKeyInfrastructure';

class GitClient {
  private client: any

  constructor(
    address: Address
  ) {
    const PROTO_PATH = __dirname + '/../../proto/git_server.proto';

    const protoLoader = require('@grpc/proto-loader');
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });
    const git_server_proto = grpc.loadPackageDefinition(packageDefinition);


    // const {keyPem, certPem} = createX509Certificate()
    // const credentials = grpc.credentials.createSsl(certPem, keyPem, certPem)
    // this.client = new (git_server_proto.GitServer as any)(address.toString(), credentials);
    this.client = new (git_server_proto.GitServer as any)(address.toString(), grpc.credentials.createInsecure());
  }

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
          body: this.iterFromData(infoResponse),
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
          body: this.iterFromData(packResponse),
          headers: headers
        })
      } else {
        reject(new Error('Method not supported'))
      }
    })
  }

  // ==== HELPER METHODS ==== //
  private async requestInfo(vaultName: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      this.client.requestInfo({vaultName: vaultName}, function(err, response) {
        if (err) {
          reject(err)
        } else {
          resolve(response.body);
        }
      });
    })
  }

  private async requestPack(vaultName: string, body: Buffer): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      this.client.requestPack({vaultName: vaultName, body: body}, function(err, response) {
        if (err) {
          console.log('err');
          console.log(err);

          reject(err)
        } else {
          resolve(response.body);
        }
      });
    })
  }

  private iterFromData(data: Buffer) {
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
