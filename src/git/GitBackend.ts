import path from 'path';
import { EncryptedFS } from 'encryptedfs';
import { PassThrough } from 'readable-stream';
import uploadPack from './upload-pack/uploadPack';
import GitSideBand from './side-band/GitSideBand';
import packObjects from './pack-objects/packObjects';
import * as gitInterface from '../../proto/js/Git_pb';

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
    getVaultNames: (peerId: string) => string[],
  ) {
    this.repoDirectoryPath = repoDirectoryPath;
    this.getFileSystem = getFileSystem;
    this.getVaultNames = getVaultNames;
  }

  async handleGitMessage(request: Uint8Array, peerId: string): Promise<Uint8Array> {
    const decodedRequest = gitInterface.GitMessage.deserializeBinary(request);
    const type = decodedRequest.getType()
    const subMessage = decodedRequest.getSubmessage_asU8()
    let response: Uint8Array;
    switch (type) {
      case gitInterface.GitMessageType.INFO:
        {
          const decodedSubMessage = gitInterface.InfoRequest.deserializeBinary(subMessage)
          const vaultName = decodedSubMessage.getVaultname()
          const encodedResponse = new gitInterface.InfoReply
          encodedResponse.setVaultname(vaultName)
          encodedResponse.setBody(await this.handleInfoRequest(vaultName))
          response = encodedResponse.serializeBinary()
        }
        break;
      case gitInterface.GitMessageType.PACK:
        {
          const decodedSubMessage = gitInterface.PackRequest.deserializeBinary(subMessage)
          const vaultName = decodedSubMessage.getVaultname()
          const body = decodedSubMessage.getBody_asU8()
          const encodedResponse = new gitInterface.PackReply
          encodedResponse.setVaultname(vaultName)
          encodedResponse.setBody(await this.handlePackRequest(vaultName, Buffer.from(body)))
          response = encodedResponse.serializeBinary()
        }
        break;
      case gitInterface.GitMessageType.VAULT_NAMES:
        {
          const encodedResponse = new gitInterface.VaultNamesReply
          encodedResponse.setVaultNameListList(await this.handleVaultNamesRequest(peerId))
          response = encodedResponse.serializeBinary()
        }
        break;
      default: {
        throw Error('git message type not supported');
      }
    }
    // encode a git response
    const encodedResponse = new gitInterface.GitMessage
    encodedResponse.setType(type)
    encodedResponse.setSubmessage(response)
    const gitResponse = encodedResponse.serializeBinary()
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
