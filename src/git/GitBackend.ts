import path from 'path';
import { EncryptedFS } from 'encryptedfs';
import { gitInterface } from '../../proto/js/Git';
import { PassThrough } from 'readable-stream';
import uploadPack from './upload-pack/uploadPack';
import GitSideBand from './side-band/GitSideBand';
import packObjects from './pack-objects/packObjects';

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
  private getVaultNames: (peerId: string) => string[];

  constructor(
    repoDirectoryPath: string,
    getFileSystem: (repoName: string) => any,
    getVaultNames: (publicKey: string) => string[],
  ) {
    this.repoDirectoryPath = repoDirectoryPath;
    this.getFileSystem = getFileSystem;
    this.getVaultNames = getVaultNames;
  }

  async handleGitMessage(request: Uint8Array, publicKey: string): Promise<Uint8Array> {
    const { type, subMessage } = gitInterface.GitMessage.decodeDelimited(request);
    let response: Uint8Array;
    switch (type) {
      case gitInterface.GitMessageType.INFO:
        {
          const { vaultName } = gitInterface.InfoRequest.decodeDelimited(subMessage);
          response = gitInterface.InfoReply.encodeDelimited({
            vaultName,
            body: await this.handleInfoRequest(vaultName),
          }).finish();
        }
        break;
      case gitInterface.GitMessageType.PACK:
        {
          const { vaultName, body } = gitInterface.PackRequest.decodeDelimited(subMessage);
          response = gitInterface.PackReply.encodeDelimited({
            vaultName,
            body: await this.handlePackRequest(vaultName, Buffer.from(body)),
          }).finish();
        }
        break;
      case gitInterface.GitMessageType.VAULT_NAMES:
        {
          response = gitInterface.VaultNamesReply.encodeDelimited({
            vaultNameList: await this.handleVaultNamesRequest(publicKey),
          }).finish();
        }
        break;
      default: {
        throw Error('git message type not supported');
      }
    }
    // encode a git response
    const gitResponse = gitInterface.GitMessage.encodeDelimited({ type, subMessage: response }).finish();
    return gitResponse;
  }

  async handleInfoRequest(repoName: string): Promise<Buffer> {
    // Only handle upload-pack for now
    const service = 'upload-pack';

    const fileSystem = this.getFileSystem(repoName);

    const responseBuffers: Buffer[] = [];

    if (!fileSystem.existsSync(path.join(this.repoDirectoryPath, repoName))) {
      throw Error(`repository does not exist: '${repoName}'`);
    }

    responseBuffers.push(Buffer.from(this.createGitPacketLine('# service=git-' + service + '\n')));
    responseBuffers.push(Buffer.from('0000'));

    const buffers = await uploadPack(fileSystem, path.join(this.repoDirectoryPath, repoName), undefined, true);
    const buffersToWrite = buffers ?? [];
    responseBuffers.push(...buffersToWrite);

    return Buffer.concat(responseBuffers);
  }

  async handlePackRequest(repoName: string, body: Buffer): Promise<Buffer> {
    // eslint-disable-next-line
    return new Promise<Buffer>(async (resolve, reject) => {
      const responseBuffers: Buffer[] = [];

      const fileSystem = this.getFileSystem(repoName);

      // Check if repo exists
      if (!fileSystem.existsSync(path.join(this.repoDirectoryPath, repoName))) {
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
        const sideBand = GitSideBand.mux('side-band-64', readable, packResult.packstream, progressStream, []);
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
      }
    });
  }

  async handleVaultNamesRequest(peerId: string): Promise<string[]> {
    return this.getVaultNames(peerId);
  }

  // ============ Helper functions ============ //
  private createGitPacketLine(line: string) {
    const hexPrefix = (4 + line.length).toString(16);
    return Array(4 - hexPrefix.length + 1).join('0') + hexPrefix + line;
  }
}

export default GitBackend;
