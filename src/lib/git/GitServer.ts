import Path from 'path'
import http from 'http'
import { AddressInfo } from "net";
import { parse } from 'querystring'
import { Address } from '../peers/PeerInfo';
import VaultManager from '../vaults/VaultManager';
import uploadPack from '../git/upload-pack/uploadPack';
import GitSideBand from '../git/side-band/GitSideBand';
import { Readable, PassThrough } from 'readable-stream';
import packObjects from '../git/pack-objects/packObjects';

// Here is the protocol git outlines for sending pack files over http:
// https://git-scm.com/docs/pack-protocol/2.17.0
// https://github.com/git/git/blob/master/Documentation/technical/pack-protocol.txt
// This should be consulted in developing our upload pack implementation

// This git backend (as well as HttpDuplex class) is heavily inspired by node-git-server:
// https://github.com/gabrielcsapo/node-git-server

// We need someway to notify other agents about what vaults we have based on some type of authorisation because they don't explicitly know about them

const services = ['upload-pack', 'receive-pack']

class GitServer {
  private polykeyPath: string;
  private vaultManager: VaultManager;
  private server: http.Server;

  address: Address
  constructor(
    polykeyPath: string,
    vaultManager: VaultManager,
    port: number = 0
  ) {
    this.polykeyPath = polykeyPath
    this.vaultManager = vaultManager

    this.server = http.createServer((req, res) => {
      this.handle(req, res)
    }).listen(port)

    this.address = Address.fromAddressInfo(<AddressInfo>this.server.address())
  }

  /**
   * Find out whether vault exists.
   * @param vaultName Name of vault to check
   * @param publicKey Public key of peer trying to access vault
   */
  private exists(vaultName: string, publicKey: string) {
    const vault = this.vaultManager.getVault(vaultName)
    if (vault) {
      return vault.peerCanAccess(publicKey)
    }
    return false
  }

  /**
   * Handle incoming info or pack requests and delegates to respective functions
   * @param req Incoming http message
   * @param res Outgoing server response
   */
  private handle(req: http.IncomingMessage, res: http.ServerResponse) {
    res.setHeader('connection', 'close')

    if (req.method == 'GET') {
      this.handleInfoRequest(req, res)
    } else if (req.method == 'POST') {
      this.handlePackRequest(req, res)
    } else {
      res.statusCode = 405
      res.end('method not supported')
    }
  }

  /**
   * Returns a not found response
   * @param res Outgoing server response
   */
  private notFoundResponse(res: http.ServerResponse) {
    res.statusCode = 404
    res.end('not found')
  }

  /**
   * Handles a request for remote info
   * @param req Incoming http message
   * @param res Outgoing server response
   */
  private handleInfoRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const splitUrl = req.url?.split('?') ?? []
    if (splitUrl.length != 2) {
      return this.notFoundResponse(res)
    }

    const pathname = splitUrl[0]
    const query = splitUrl[1]

    const m = pathname.match(/\/(.+)\/info\/refs$/)
    if (!m || /\.\./.test(m[1])) {
      return this.notFoundResponse(res)
    }

    const repo = m[1]
    const params = parse(query)
    if (!params.service) {
      res.statusCode = 400
      res.end('service parameter required')
      return
    }

    const service = (<string>params.service).replace(/^git-/, '')
    if (services.indexOf(service) < 0) {
      res.statusCode = 405
      res.end('service not available')
      return
    }

    this.infoResponse(repo, service, res)
  }

  /**
   * Handles a requests for packfiles
   * @param req Incoming http message
   * @param res Outgoing server response
   */
  private handlePackRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const m = req.url!.match(/\/(.+)\/git-(.+)/)
    if (!m || /\.\./.test(m[1])) {
      return this.notFoundResponse(res)
    }

    const repo = m[1]
    const service = m[2]

    if (services.indexOf(service) < 0) {
      res.statusCode = 405
      res.end('service not available')
      return
    }

    res.setHeader('content-type', 'application/x-git-' + service + '-result')
    this.noCache(res)

    const repoDir = Path.join(this.polykeyPath, repo)

    // Check if vault exists
    const connectingPublicKey = ''
    if (!this.exists(repo, connectingPublicKey)) {
      res.statusCode = 404
      res.end('not found')
      return
    }

    const fileSystem = this.vaultManager.getVault(repo)?.EncryptedFS

    if (fileSystem) {
      req.on('data', async (data) => {
        if (data.toString().slice(4, 8) == 'want') {
          const wantedObjectId = data.toString().slice(9, 49)
          const packResult = await packObjects(
            fileSystem,
            repoDir,
            [wantedObjectId],
            undefined
          )

          // This the 'wait for more data' line as I understand it
          res.write(Buffer.from('0008NAK\n'))

          // This is to get the side band stuff working
          const readable = new PassThrough()
          const progressStream = new PassThrough()
          const sideBand = GitSideBand.mux(
            'side-band-64',
            readable,
            packResult.packstream,
            progressStream,
            []
          )
          sideBand.pipe(res)

          // Write progress to the client
          progressStream.write(Buffer.from('0014progress is at 50%\n'))
          progressStream.end()
        }
      })
    }
  }

  // ============ Helper functions ============ //
  /**
   * Sends http response containing git info about the particular vault
   * @param vaultName Name of the requested vault
   * @param service The type of service requested, either upload-pack or recieve-pack
   * @param res Outgoing server response
   */
  private infoResponse(vaultName: string, service: string, res: http.ServerResponse) {

    const connectingPublicKey = ''
    const exists = this.exists(vaultName, connectingPublicKey)

    if (!exists) {
      res.statusCode = 404
      res.setHeader('content-type', 'text/plain')
      res.end('repository not found')
    } else {
      res.setHeader(
        'content-type',
        'application/x-git-' + service + '-advertisement'
      )
      this.noCache(res)

      this.uploadPackRespond(
        vaultName,
        service,
        res
      )
    }
  }

  /**
   * Adds headers to the response object to add cache control
   * @param res Outgoing server response
   */
  private noCache(res: http.ServerResponse) {
    res.setHeader('expires', 'Fri, 01 Jan 1980 00:00:00 GMT')
    res.setHeader('pragma', 'no-cache')
    res.setHeader('cache-control', 'no-cache, max-age=0, must-revalidate')
  }

  /**
   * Encodes a string into a git packet line by prefixing the hexadecimal length of the line
   * @param line The line to be encoded
   */
  private createGitPacketLine(line: string) {
    const hexPrefix = (4 + line.length).toString(16)
    return Array(4 - hexPrefix.length + 1).join('0') + hexPrefix + line
  }


  /**
   * Handles the response to a git packfile request
   * @param vaultName Name of the requested vault
   * @param vaultPath Path to the target vault
   * @param service The type of service requested, either upload-pack or recieve-pack
   * @param res Outgoing server response
   */
  private async uploadPackRespond(vaultName: string, service: string, res: http.ServerResponse) {
    res.write(this.createGitPacketLine('# service=git-' + service + '\n'))
    res.write('0000')

    const fileSystem = this.vaultManager.getVault(vaultName)?.EncryptedFS

    const buffers = await uploadPack(
      fileSystem,
      Path.join(this.polykeyPath, vaultName),
      undefined,
      true
    )
    const buffersToWrite = buffers ?? []

    // Pipe the data back into response stream
    const readable = Readable.from(buffersToWrite);
    readable.pipe(res)
  }
}

export default GitServer
