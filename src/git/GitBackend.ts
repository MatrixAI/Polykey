import fs from 'fs';
import path from 'path';
import { EncryptedFS } from 'encryptedfs';
import { PassThrough } from 'readable-stream';
import uploadPack from './upload-pack/uploadPack';
import GitSideBand from './side-band/GitSideBand';
import packObjects from './pack-objects/packObjects';
import Logger from '@matrixai/logger';

// Here is the protocol git outlines for sending pack files over http:
// https://git-scm.com/docs/pack-protocol/2.17.0
// https://github.com/git/git/blob/master/Documentation/technical/pack-protocol.txt
// This should be consulted in developing our upload pack implementation

// This git backend (as well as HttpDuplex class) is heavily inspired by node-git-server:
// https://github.com/gabrielcsapo/node-git-server

// We need someway to notify other agents about what vaults we have based on some type of authorisation because they don't explicitly know about them

class GitBackend {
  private repoDirectoryPath: string;
  private getFileSystem: (repoName: string) => EncryptedFS;
  private getVaultNames: (nodeId: string) => string[];

  private logger: Logger;

  constructor(
    repoDirectoryPath: string,
    getFileSystem: (repoName: string) => any,
    getVaultNames: (nodeId: string) => string[],
    logger: Logger,
  ) {
    this.repoDirectoryPath = repoDirectoryPath;
    this.getFileSystem = getFileSystem;
    this.getVaultNames = getVaultNames;
    this.logger = logger;
  }

  async handleInfoRequest(repoName: string): Promise<Buffer> {
    // Only handle upload-pack for now
    const service = 'upload-pack';

    const fileSystem = this.getFileSystem(repoName);

    const responseBuffers: Buffer[] = [];

    if (!fileSystem.existsSync(path.join(this.repoDirectoryPath, repoName))) {
      throw Error(`repository does not exist: '${repoName}'`);
    }

    responseBuffers.push(
      Buffer.from(this.createGitPacketLine('# service=git-' + service + '\n')),
    );
    responseBuffers.push(Buffer.from('0000'));

    const buffers = await uploadPack(
      fileSystem,
      path.join(this.repoDirectoryPath, repoName),
      undefined,
      true,
    );
    const buffersToWrite = buffers ?? [];
    responseBuffers.push(...buffersToWrite);

    return Buffer.concat(responseBuffers);
  }

  async handlePackRequest(repoName: string, body: Buffer): Promise<Buffer> {
    // eslint-disable-next-line
    return new Promise<Buffer>(async (resolve, reject) => {
      try {
        const responseBuffers: Buffer[] = [];
        const fileSystem = this.getFileSystem(repoName);
        // Check if repo exists
        if (!fs.existsSync(path.join(this.repoDirectoryPath, repoName))) {
          throw Error(`repository does not exist: '${repoName}'`);
        }

        if (body.toString().slice(4, 8) == 'want') {
          const wantedObjectId = body.toString().slice(9, 49);
          const packResult = await packObjects(
            fileSystem,
            path.join(this.repoDirectoryPath, repoName),
            [wantedObjectId],
            undefined,
          );

          // This the 'wait for more data' line as I understand it
          responseBuffers.push(Buffer.from('0008NAK\n'));

          // This is to get the side band stuff working
          const readable = new PassThrough();
          const progressStream = new PassThrough();
          const sideBand = GitSideBand.mux(
            'side-band-64',
            readable,
            packResult.packstream,
            progressStream,
            [],
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
          throw Error(
            "git pack request body message is not prefixed by 'want'",
          );
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async handleVaultNamesRequest(nodeId: string): Promise<string[]> {
    return this.getVaultNames(nodeId);
  }

  // ============ Helper functions ============ //
  private createGitPacketLine(line: string) {
    const hexPrefix = (4 + line.length).toString(16);
    return Array(4 - hexPrefix.length + 1).join('0') + hexPrefix + line;
  }
}

export default GitBackend;
