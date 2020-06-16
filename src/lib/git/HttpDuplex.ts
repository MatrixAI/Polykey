import http from 'http'
import zlib from 'zlib';
import through from 'through';
import { EncryptedFS } from 'encryptedfs';
import GitSideBand from "./side-band/GitSideBand";
import packObjects from './pack-objects/PackObjects';

const headerRE = {
  'receive-pack': '([0-9a-fA-F]+) ([0-9a-fA-F]+) refs\/(heads|tags)\/(.*?)( |00|\u0000)|^(0000)$', // eslint-disable-line
  'upload-pack': '^\\S+ ([0-9a-fA-F]+)'
};

export class HttpDuplex {
  req: http.IncomingMessage
  res: http.ServerResponse

  status: string = 'pending';
  repo: string;
  service: string;
  cwd: string;
  username: string | undefined;
  last: string;
  commit: string;
  evName: string;

  data = '';

  buffered: through.ThroughStream
  ts: through.ThroughStream
  efs: EncryptedFS

  constructor(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    repo: string,
    service: string,
    cwd: string,
    efs: EncryptedFS
  ) {
    this.req = req
    this.res = res

    this.repo = repo!
    this.service = service!
    this.cwd = cwd!

    this.efs = efs


    this.buffered = through().pause();
    this.ts = through();


    const contentEncoding = req.headers['content-encoding']

    let decoder: zlib.Gunzip | zlib.Deflate | null = null

    if (contentEncoding == 'gzip') {
      decoder = zlib.createGunzip()
    } else if (contentEncoding == 'deflate') {
      decoder = zlib.createDeflate()
    }

    if (decoder) {
      // data is compressed with gzip or deflate
      req.pipe(decoder).pipe(this.ts).pipe(this.buffered);
    } else {
      // data is not compressed
      req.pipe(this.ts).pipe(this.buffered);
    }

    if (req.headers["authorization"]) {
      const tokens = req.headers["authorization"].split(" ");
      if (tokens[0] === "Basic") {
        const splitHash = Buffer.from(tokens[1], 'base64').toString('utf8').split(":");
        this.username = splitHash.shift();
      }
    }

    this.ts.once('data', this.onData.bind(this))
  }

  // As far as I understand it, this was originally used for accumulating data
  // on the request stream
  onData(buf: Buffer) {
    this.data += buf;

    const ops = this.data.match(new RegExp(headerRE[this.service], 'gi'));
    if (!ops) {
      return
    }

    this.data = '';

    for (const op of ops) {
      let type: string;
      let m = op.match(new RegExp(headerRE[this.service]));

      if (this.service === 'receive-pack' && m !== null) {
        this.last = m[1];
        this.commit = m[2];

        if (m[3] == 'heads') {
          type = 'branch';
          this.evName = 'push';
        } else {
          type = 'version';
          this.evName = 'tag';
        }
        this.accept()
      } else if (this.service === 'upload-pack' && m !== null) {
        this.accept()
      }
    }
  }

  /**
   * reject request in flight
   */
  reject(code: number, msg: string): void {
    if (this.status !== 'pending') return;

    if (msg === undefined && typeof code === 'string') {
      msg = code;
      code = 500;
    }
    this.status = 'rejected';
    this.res.statusCode = code;
    this.res.end(msg);
  }

  /**
   * accepts request to access resource
   */
  accept(): void {
    if (this.status !== 'pending') return;

    this.status = 'accepted';


    this.buffered.on('data', async (data) => {
      if (data.toString().slice(4, 8) == 'want') {
        const wantedObjectId = data.toString().slice(9, 49)
        const repoDir = this.cwd
        const packResult = await packObjects(
          this.efs,
          repoDir,
          [wantedObjectId],
          undefined
        )
        this.res.write(Buffer.from('0008NAK\n'))

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
        sideBand.pipe(this.res)

        // Write progress to the client
        progressStream.write(Buffer.from('0014progress is at 50%\n'))
        progressStream.end()
      }
    })

    this.buffered.resume();
  }

  destroy() {
    this.req.destroy();
    this.res.destroy();
  }
}
