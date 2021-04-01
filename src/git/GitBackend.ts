import fs from 'fs';
import path from 'path';
import { EncryptedFS } from 'encryptedfs';
import { PassThrough } from 'readable-stream';
import Logger from '@matrixai/logger';
import * as gitUtils from './utils';
import * as errors from './errors';

// Here is the protocol git outlines for sending pack files over http:
// https://git-scm.com/docs/pack-protocol/2.17.0
// https://github.com/git/git/blob/master/Documentation/technical/pack-protocol.txt
// This should be consulted in developing our upload pack implementation

// This git backend (as well as HttpDuplex class) is heavily inspired by node-git-server:
// https://github.com/gabrielcsapo/node-git-server

// We need someway to notify other agents about what vaults we have based on some type of authorisation because they don't explicitly know about them

class GitBackend {
  public readonly baseDir: string;
  private getFileSystem: (repoName: string) => EncryptedFS;
  private getVaultNames: (nodeId: string) => string[];
  private logger: Logger;

  constructor(
    baseDir: string,
    getFileSystem: (repoName: string) => any,
    getVaultNames: (nodeId: string) => string[],
    logger?: Logger,
  ) {
    this.baseDir = baseDir;
    this.getFileSystem = getFileSystem;
    this.getVaultNames = getVaultNames;
    this.logger = logger ?? new Logger('GitBackend');
  }

  public async handleInfoRequest(repoName: string): Promise<Buffer> {
    // Service for uploading packets
    const service = 'upload-pack';

    const fileSystem = this.getFileSystem(repoName);

    const responseBuffers: Buffer[] = [];

    if (!fileSystem.existsSync(path.join(this.baseDir, repoName))) {
      throw new Error(`repository does not exist: '${repoName}'`);
    }

    // define the service
    responseBuffers.push(
      Buffer.from(
        gitUtils.createGitPacketLine('# service=git-' + service + '\n'),
      ),
    );

    responseBuffers.push(Buffer.from('0000'));

    const buffers = await gitUtils.uploadPack(
      fileSystem,
      path.join(this.baseDir, repoName),
      undefined,
      true,
    );
    const buffersToWrite = buffers ?? [];
    responseBuffers.push(...buffersToWrite);

    return Buffer.concat(responseBuffers);
  }

  public async handlePackRequest(
    repoName: string,
    body: Buffer,
  ): Promise<Buffer> {
    // eslint-disable-next-line
        return new Promise<Buffer>(async (resolve, reject) => {
      try {
        const responseBuffers: Buffer[] = [];
        const fileSystem = this.getFileSystem(repoName);
        // Check if repo exists
        if (!fs.existsSync(path.join(this.baseDir, repoName))) {
          throw new errors.ErrorRepositoryUndefined(
            `repository does not exist: '${repoName}'`,
          );
        }

        if (body.toString().slice(4, 8) == 'want') {
          const wantedObjectId = body.toString().slice(9, 49);
          const packResult = await gitUtils.packObjects(
            fileSystem,
            path.join(this.baseDir, repoName),
            [wantedObjectId],
            undefined,
          );

          // This the 'wait for more data' line as I understand it
          responseBuffers.push(Buffer.from('0008NAK\n'));

          // This is to get the side band stuff working
          const readable = new PassThrough();
          const progressStream = new PassThrough();
          const sideBand = gitUtils.mux(
            'side-band-64',
            readable,
            packResult.packstream,
            progressStream,
          );
          sideBand.on('data', (data: Buffer) => {
            responseBuffers.push(data);
          });
          sideBand.on('end', () => {
            resolve(Buffer.concat(responseBuffers));
          });
          sideBand.on('error', (err) => {
            reject(err);
          });

          // Write progress to the client
          progressStream.write(Buffer.from('0014progress is at 50%\n'));
          progressStream.end();
        } else {
          throw new Error(
            "git pack request body message is not prefixed by 'want'",
          );
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  handleVaultNamesRequest(nodeId: string): string[] {
    return this.getVaultNames(nodeId);
  }
}

export default GitBackend;
