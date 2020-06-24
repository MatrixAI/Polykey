import net from 'net'
import Path from 'path'
import http from 'http'
import through from 'through';
import { promisify } from "util";
import { AddressInfo } from "net";
import { Readable } from "stream";
import { parse } from 'querystring'
import VaultManager from '@polykey/vaults/VaultManager';
import uploadPack from '@polykey/git/upload-pack/uploadPack';
import GitSideBand from '@polykey/git/side-band/GitSideBand';
import packObjects from '@polykey/git/pack-objects/packObjects';
import HttpMessageBuilder from './http-message/http-message-builder';
import HttpMessageParser from './http-message/http-message-parser';

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
  exists(vaultName: string, publicKey: string) {
    const vault = this.vaultManager.getVault(vaultName)
    if (vault) {
      return vault.peerCanAccess(publicKey)
    }
    return false
  }

  /**
   * returns the typeof service being process
   */
  getType(service: any): string {
    switch (service) {
      case 'upload-pack':
        return 'fetch'
      case 'receive-pack':
        return 'push'
      default:
        return 'unknown'
    }
  }

  //=======================================//
  //=======================================//
  //=======================================//
  //=======================================//
  //=======================================//
  //============= NodeJS Http =============//
  //=======================================//
  //=======================================//
  //=======================================//
  //=======================================//
  //=======================================//
  /**
   * Handle incoming HTTP requests with a connect-style middleware
   */
  private handle(req: http.IncomingMessage, res: http.ServerResponse) {
    res.setHeader('connection', 'close')

    if (req.method == 'GET') {
      this.handleInfoRequests(req, res)
    } else if (req.method == 'POST') {
      this.handlePackRequests(req, res)
    } else {
      res.statusCode = 405
      res.end('method not supported')
    }
  }

  private notFoundResponse(res: http.ServerResponse) {
    res.statusCode = 404
    res.end('not found')
  }

  private handleInfoRequests(req: http.IncomingMessage, res: http.ServerResponse) {
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

    this.infoResponse(repo, service, req, res)
  }

  private handlePackRequests(req: http.IncomingMessage, res: http.ServerResponse) {
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
          const readable = through()
          const progressStream = through()
          const sideBand = GitSideBand.mux(
            'side-band-64',
            readable,
            packResult.packstream,
            progressStream,
            []
          )
          sideBand.pipe(res)
          // const responseStream = through()
          // sideBand.pipe(responseStream)
          // responseStream.on('data', data => {
          //   const message = new HttpMessageBuilder()
          //   message.appendToBody(data.toString())
          //   console.log('data');
          //   console.log(message.build().toString());
          // })

          // Write progress to the client
          progressStream.write(Buffer.from('0014progress is at 50%\n'))
          progressStream.end()
        }
      })
    }
  }

  /**
   * sends http response using the appropriate output from service call
   */
  infoResponse(repo: string, service: string, req: http.IncomingMessage, res: http.ServerResponse) {

    const connectingPublicKey = ''
    const exists = this.exists(repo, connectingPublicKey)

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
        service,
        repo,
        Path.join(this.polykeyPath, repo),
        res
      )
    }
  }

  /**
   * adds headers to the response object to add cache control
   */
  noCache(res: http.ServerResponse) {
    res.setHeader('expires', 'Fri, 01 Jan 1980 00:00:00 GMT')
    res.setHeader('pragma', 'no-cache')
    res.setHeader('cache-control', 'no-cache, max-age=0, must-revalidate')
  }

  /**
   * execute given git operation and respond
   */
  async uploadPackRespond(service: string, repoName: string, repoLocation: string, res: http.ServerResponse) {
    res.write(this.createGitPacketLine('# service=git-' + service + '\n'))
    res.write('0000')

    const fileSystem = this.vaultManager.getVault(repoName)?.EncryptedFS

    const buffers = await uploadPack(
      fileSystem,
      repoLocation,
      undefined,
      true
    )
    const buffersToWrite = buffers ?? []

    async function * generate() {

      yield buffersToWrite[0];
      yield buffersToWrite[1];
      yield buffersToWrite[2];
    }

    // Pipe the data back into response stream
    const readable = Readable.from(generate());
    readable.pipe(res)
  }

  //=======================================//
  //=======================================//
  //=======================================//
  //=======================================//
  //=======================================//
  //============= Custom Http =============//
  //=======================================//
  //=======================================//
  //=======================================//
  //=======================================//
  //=======================================//
  /**
   * Handle incoming HTTP requests with a connect-style middleware
   */
  private handleSocket(socket: net.Socket, req: HttpMessageParser, res: HttpMessageBuilder) {
    res.setHeader('connection', 'close')

    if (req.method == 'GET') {
      this.handleInfoRequestsSocket(socket, req, res)
    } else if (req.method == 'POST') {
      this.handlePackRequestsSocket(socket, req, res)
    } else {
      res.statusCode = 405
      res.end('method not supported')
    }
  }

  private notFoundResponseSocket(socket: net.Socket, res: HttpMessageBuilder) {
    res.statusCode = 404
    res.end('not found')
  }

  private handleInfoRequestsSocket(socket: net.Socket, req: HttpMessageParser, res: HttpMessageBuilder) {
    const splitUrl = req.url?.split('?') ?? []
    if (splitUrl.length != 2) {
      return this.notFoundResponseSocket(socket, res)
    }

    const pathname = splitUrl[0]
    const query = splitUrl[1]

    const m = pathname.match(/\/(.+)\/info\/refs$/)
    if (!m || /\.\./.test(m[1])) {
      return this.notFoundResponseSocket(socket, res)
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


    this.infoResponseSocket(repo, service, socket, res)
  }

  private async handlePackRequestsSocket(socket: net.Socket, req: HttpMessageParser, res: HttpMessageBuilder) {
    const m = req.url!.match(/\/(.+)\/git-(.+)/)
    if (!m || /\.\./.test(m[1])) {
      return this.notFoundResponseSocket(socket, res)
    }

    const repo = m[1]
    const service = m[2]

    if (services.indexOf(service) < 0) {
      res.statusCode = 405
      res.end('service not available')
      return
    }

    res.setHeader('content-type', 'application/x-git-' + service + '-result')
    this.noCacheSocket(res)

    const repoDir = Path.join(this.polykeyPath, repo)

    // Check if vault exists
    const connectingPublicKey = ''
    if (!this.exists(repo, connectingPublicKey)) {
      res.statusCode = 404
      res.end('not found')
      return
    }

    const fileSystem = this.vaultManager.getVault(repo)?.EncryptedFS


    const data = req.body
    if (fileSystem && data) {
      if (data.toString().slice(4, 8) == 'want') {
        const wantedObjectId = data.toString().slice(9, 49)
        const packResult = await packObjects(
          fileSystem,
          repoDir,
          [wantedObjectId],
          undefined
        )

        // This the 'wait for more data' line as I understand it
        res.write('0008NAK\n')

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
        // sideBand.pipe(res)
        const responseStream = through()
        sideBand.pipe(responseStream)
        responseStream.on('data', data => {
          res.write(data.toString())
        })
        sideBand.on('end', () => {
          res.end()
        })

        // Write progress to the client
        progressStream.write(Buffer.from('0014progress is at 50%\n'))
        progressStream.end()
      }
    }
  }

  /**
   * sends http response using the appropriate output from service call
   */
  infoResponseSocket(repo: string, service: string, socket: net.Socket, res: HttpMessageBuilder) {

    const connectingPublicKey = ''
    const exists = this.exists(repo, connectingPublicKey)

    if (!exists) {
      res.statusCode = 404
      res.setHeader('content-type', 'text/plain')
      res.end('repository not found')
    } else {
      res.setHeader(
        'content-type',
        'application/x-git-' + service + '-advertisement'
      )

      this.noCacheSocket(res)

      this.uploadPackRespondSocket(
        service,
        repo,
        Path.join(this.polykeyPath, repo),
        socket,
        res
      )
    }
  }

  /**
   * adds headers to the response object to add cache control
   */
  noCacheSocket(res: HttpMessageBuilder) {
    res.setHeader('expires', 'Fri, 01 Jan 1980 00:00:00 GMT')
    res.setHeader('pragma', 'no-cache')
    res.setHeader('cache-control', 'no-cache, max-age=0, must-revalidate')
  }

  /**
   * execute given git operation and respond
   */
  async uploadPackRespondSocket(service: string, repoName: string, repoLocation: string, socket: net.Socket, res: HttpMessageBuilder) {
    res.write(this.createGitPacketLine('# service=git-' + service + '\n'))
    res.write('0000')

    const fileSystem = this.vaultManager.getVault(repoName)?.EncryptedFS

    const buffers = await uploadPack(
      fileSystem,
      repoLocation,
      undefined,
      true
    )
    const buffersToWrite = buffers ?? []

    async function * generate() {

      yield buffersToWrite[0];
      yield buffersToWrite[1];
      yield buffersToWrite[2];
    }

    // Pipe the data back into response stream
    const readable = Readable.from(generate());
    readable.on('data', data => {
      res.write(data.toString())
    })

    readable.on('end', () => {
      socket.end()
    })
  }

  /**
   * starts a git server on the given port
   */
  listen(server: net.Server, port: number = 0): AddressInfo {
    server.addListener('connection', socket => {
      socket.on('data', data => {
        console.log('data');
        console.log(data.toString());


        const req = new HttpMessageParser(data)
        const res = new HttpMessageBuilder(socket)
        this.handleSocket(socket, req, res)
      })
    })


    this.server = http.createServer((req, res) => {
      req.on('data', data => {
        console.log(data.toString());
      })

      this.handle(req, res)
    }).listen(port)

    return <AddressInfo>this.server.address()
  }

  /**
   * stops the server instance
   */
  async stop() {
    await promisify(this.server.close)()
  }

  // ============ Helper functions ============ //
  /**
   * parses a git string and returns the repo name
   */
  parseGitName(repo: string): string {
    const locationOfGit = repo.lastIndexOf('.git')
    return repo.substr(0, locationOfGit > 0 ? locationOfGit : repo.length)
  }

  createGitPacketLine(line: string) {
    const hexPrefix = (4 + line.length).toString(16)
    return Array(4 - hexPrefix.length + 1).join('0') + hexPrefix + line
  }
}

export default GitServer
