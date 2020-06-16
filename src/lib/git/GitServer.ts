import fs from 'fs'
import url from 'url'
import Path from 'path'
import http from 'http'
import { promisify } from "util";
import { AddressInfo } from "net";
import { Readable } from "stream";
import { parse } from 'querystring'
import { HttpDuplex } from "./HttpDuplex";
import uploadPack from "./upload-pack/UploadPack";
import VaultStore from "@polykey/vault-store/VaultStore";

// Here is the protocol git outlines for sending pack files over http:
// https://git-scm.com/docs/pack-protocol/2.17.0
// https://github.com/git/git/blob/master/Documentation/technical/pack-protocol.txt
// This should be consulted in developing our upload pack implementation

// This git backend (as well as HttpDuplex class) is heavily inspired by node-git-server:
// https://github.com/gabrielcsapo/node-git-server

// We need someway to notify other agents about what vaults we have based on some type of authorisation because they don't explicitly know about them

const services = ['upload-pack', 'receive-pack']

class GitServer {
  private repoDir: string;
  private vaultStore: VaultStore;
  private server: http.Server;
  constructor(
    repoDir: string,
    vaultStore: VaultStore
  ) {
    this.repoDir = repoDir
    this.vaultStore = vaultStore
  }

  /**
   * Find out whether `repoName` exists.
   */
  exists(repo: string) {
    // TODO: consider if vault has been shared
    return fs.existsSync(Path.join(this.repoDir, repo))
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


  // alternatively you can also pass authenticate a promise
  authenticate(
    type: string,
    repo: string,
    username: string,
    password: string,
    headers: http.IncomingHttpHeaders
  ): boolean {
    if(username === 'foo') {
      return true
    }
    return false
  }

  /**
   * Handle incoming HTTP requests with a connect-style middleware
   */
  handle(req: http.IncomingMessage, res: http.ServerResponse) {

    const infoHandler = (req: http.IncomingMessage, res: http.ServerResponse): boolean => {

      if (req.method !== 'GET') return false

      const u = url.parse(req.url!)
      const m = u.pathname!.match(/\/(.+)\/info\/refs$/)
      if (!m) return false
      if (/\.\./.test(m[1])) return false


      const repo = m[1]
      const params = parse(u.query!)
      if (!params.service) {
        res.statusCode = 400
        res.end('service parameter required')
        return true
      }

      const service = (<string>params.service).replace(/^git-/, '')
      if (services.indexOf(service) < 0) {
        res.statusCode = 405
        res.end('service not available')
        return true
      }

      const repoName = this.parseGitName(m[1])

      // check if the repo is authenticated
      const type = this.getType(service)
      const headers = req.headers
      const { username, password } = {username: 'foo', password: 's'}
      let authenticated: boolean = false

      if (username && password) {
        authenticated = this.authenticate(type, repoName, username, password, headers)
      }

      if (!authenticated) {
        res.setHeader("Content-Type", 'text/plain')
        res.setHeader("WWW-Authenticate", 'Basic realm="authorization needed"')
        res.writeHead(401)
        res.end('Unauthorised to view this repo')
        return true
      }

      this.infoResponse(repo, service, req, res)
      return true
    }
    const requestPackHandler = (req: http.IncomingMessage, res: http.ServerResponse): boolean => {
      if (req.method !== 'POST') return false
      const m = req.url!.match(/\/(.+)\/git-(.+)/)
      if (!m) return false
      if (/\.\./.test(m[1])) return false

      const repo = m[1]
      const service = m[2]

      if (services.indexOf(service) < 0) {
        res.statusCode = 405
        res.end('service not available')
        return true
      }

      res.setHeader('content-type', 'application/x-git-' + service + '-result')
      this.noCache(res)

      const repoDir = Path.join(this.repoDir, repo)

      const fileSystem = this.vaultStore.getVault(repo)?.efs
      if (fileSystem) {
        const dup = new HttpDuplex(
          req,
          res,
          repo,
          service,
          repoDir,
          fileSystem
        )
      }

      return true
    }
    const notSupportedHandler = (req: http.IncomingMessage, res: http.ServerResponse): boolean => {
      if (req.method !== 'GET' && req.method !== 'POST') {
        res.statusCode = 405
        res.end('method not supported')
        return true
      } else {
        return false
      }
    }
    const notFoundHandler = (req: http.IncomingMessage, res: http.ServerResponse): boolean => {
      res.statusCode = 404
      res.end('not found')
      return true
    }

    const handlers = [
      infoHandler,
      requestPackHandler,
      notSupportedHandler,
      notFoundHandler
    ]

    res.setHeader('connection', 'close')

    for (const handler of handlers) {
      const fulfilled = handler(req,res)
      if (fulfilled) {
        break
      }
    }
  }

  /**
   * starts a git server on the given port
   */
  listen(port: number = 0): AddressInfo {
    this.server = http.createServer((req, res) => {
      this.handle(req, res)
    })

    this.server.listen(port)

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


  /**
   * sends http response using the appropriate output from service call
   */
  infoResponse(repo: string, service: string, req: http.IncomingMessage, res: http.ServerResponse) {

    const exists = this.exists(repo)

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
        Path.join(this.repoDir, repo),
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

  createGitPacketLine(line: string) {
    const hexPrefix = (4 + line.length).toString(16)
    return Array(4 - hexPrefix.length + 1).join('0') + hexPrefix + line
  }


  /**
   * execute given git operation and respond
   */
  async uploadPackRespond(service: string, repoName: string, repoLocation: string, res: http.ServerResponse) {
    res.write(this.createGitPacketLine('# service=git-' + service + '\n'))
    res.write('0000')

    const fileSystem = this.vaultStore.getVault(repoName)!.efs

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
}

export default GitServer
