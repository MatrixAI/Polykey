import Path from 'path'
import grpc from 'grpc'
import through from 'through';
import VaultManager from '@polykey/vaults/VaultManager';
import uploadPack from '@polykey/git/upload-pack/uploadPack';
import GitSideBand from '@polykey/git/side-band/GitSideBand';
import packObjects from '@polykey/git/pack-objects/packObjects';
import { Address } from '@polykey/peers/PeerInfo';

// Here is the protocol git outlines for sending pack files over http:
// https://git-scm.com/docs/pack-protocol/2.17.0
// https://github.com/git/git/blob/master/Documentation/technical/pack-protocol.txt
// This should be consulted in developing our upload pack implementation

// This git backend (as well as HttpDuplex class) is heavily inspired by node-git-server:
// https://github.com/gabrielcsapo/node-git-server

// We need someway to notify other agents about what vaults we have based on some type of authorisation because they don't explicitly know about them

class GitBackend {
  private polykeyPath: string;
  private vaultManager: VaultManager;
  constructor(
    polykeyPath: string,
    vaultManager: VaultManager
  ) {
    this.polykeyPath = polykeyPath
    this.vaultManager = vaultManager
  }

  /**
   * Find out whether vault exists.
   */
  private exists(vaultName: string, publicKey: string) {
    const vault = this.vaultManager.getVault(vaultName)
    if (vault) {
      return vault.peerCanAccess(publicKey)
    }
    return false
  }

  async handleInfoRequest(vaultName: string): Promise<Buffer> {
    // Only handle upload-pack for now
    const service = 'upload-pack'

    const connectingPublicKey = ''

    const responseBuffers: Buffer[] = []

    if (!this.exists(vaultName, connectingPublicKey)) {
      throw new Error('Vault does not exist')
    } else {
      responseBuffers.push(Buffer.from(this.createGitPacketLine('# service=git-' + service + '\n')))
      responseBuffers.push(Buffer.from('0000'))

      const fileSystem = this.vaultManager.getVault(vaultName)?.EncryptedFS

      const buffers = await uploadPack(
        fileSystem,
        Path.join(this.polykeyPath, vaultName),
        undefined,
        true
      )
      const buffersToWrite = buffers ?? []
      responseBuffers.push(...buffersToWrite)
    }

    return Buffer.concat(responseBuffers)
  }
  async handlePackRequest(vaultName: string, body: Buffer): Promise<Buffer> {
    return new Promise<Buffer>(async (resolve, reject) => {
      const responseBuffers: Buffer[] = []

      // Check if vault exists
      const connectingPublicKey = ''
      if (!this.exists(vaultName, connectingPublicKey)) {
        throw new Error('Vault does not exist')
      }

      const fileSystem = this.vaultManager.getVault(vaultName)?.EncryptedFS

      if (fileSystem) {
        if (body.toString().slice(4, 8) == 'want') {
          const wantedObjectId = body.toString().slice(9, 49)
          const packResult = await packObjects(
            fileSystem,
            Path.join(this.polykeyPath, vaultName),
            [wantedObjectId],
            undefined
          )

          // This the 'wait for more data' line as I understand it
          responseBuffers.push(Buffer.from('0008NAK\n'))

          // This is to get the side band stuff working
          const readable = through()
          const progressStream = through()
          const sideBand = GitSideBand.mux(
            'side-band-64',
            readable,
            packResult.packstream,
            progressStream,
            []
          )
          sideBand.on('data', (data: Buffer) => {
            responseBuffers.push(data)
          })
          sideBand.on('end', () => {
            resolve(Buffer.concat(responseBuffers))
          })
          sideBand.on('error', (err) => {
            reject(err)
          })


          // Write progress to the client
          progressStream.write(Buffer.from('0014progress is at 50%\n'))
          progressStream.end()
        }
      }
    })
  }

  // ============ Helper functions ============ //
  private createGitPacketLine(line: string) {
    const hexPrefix = (4 + line.length).toString(16)
    return Array(4 - hexPrefix.length + 1).join('0') + hexPrefix + line
  }
}

export default GitBackend
