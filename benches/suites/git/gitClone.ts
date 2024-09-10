import type { ContextTimed } from '@matrixai/contexts';
import type { ReadableWritablePair } from 'stream/web';
import type { JSONObject, JSONRPCRequest, RPCStream } from '@matrixai/rpc';
import type { POJO } from '@';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ReadableStream, TransformStream } from 'stream/web';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import b from 'benny';
import { EncryptedFS } from 'encryptedfs';
import git from 'isomorphic-git';
import { RawCaller, RawHandler, RPCClient, RPCServer } from '@matrixai/rpc';
import * as utils from '@/utils';
import { summaryName, suiteCommon } from '../../utils';
import * as gitTestUtils from '../../../tests/git/utils';
import * as gitHttp from '../../../src/git/http';
import * as keysUtils from '../../../src/keys/utils';

async function main() {
  // Setting up repo
  const dataDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'polykey-test-'),
  );
  const testGitState = {
    author: 'tester',
    commits: [
      {
        message: 'commit1',
        files: [
          {
            name: 'file1',
            contents: 'this is a file',
          },
        ],
      },
      {
        message: 'commit2',
        files: [
          {
            name: 'file2',
            contents: 'this is another file',
          },
        ],
      },
      {
        message: 'commit3',
        files: [
          {
            name: 'file1',
            contents: 'this is a changed file',
          },
        ],
      },
    ],
  };

  // Creating state for fs
  const dirFs = path.join(dataDir, 'repository');
  const gitdirFs = path.join(dirFs, '.git');
  const gitDirsFs = {
    fs: fs as any,
    dir: dirFs,
    gitDir: gitdirFs,
    gitdir: gitdirFs,
  };
  // Creating simple state
  await gitTestUtils.createGitRepo({
    ...gitDirsFs,
    ...testGitState,
  });

  // Creating state for efs
  const logger = new Logger('generatePackRequest Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const dbKey = keysUtils.generateKey();
  const efs = await EncryptedFS.createEncryptedFS({
    dbKey,
    dbPath: dataDir,
    logger,
  });
  await efs.start();

  const dirEfs = path.join(efs.cwd, 'repository');
  const gitdirEfs = path.join(dirEfs, '.git');
  const gitDirsEfs = {
    fs: efs as any,
    dir: dirEfs,
    gitDir: gitdirEfs,
    gitdir: gitdirEfs,
  };
  await gitTestUtils.createGitRepo({
    ...gitDirsEfs,
    ...testGitState,
  });

  class GitAdvertiseHandler extends RawHandler<{
    fs: EncryptedFS;
    dir: string;
    gitDir: string;
  }> {
    public handle = async (
      input: [JSONRPCRequest, ReadableStream<Uint8Array>],
    ): Promise<[JSONObject, ReadableStream<Uint8Array>]> => {
      const { fs, dir, gitDir } = this.container;
      const [, inputStream] = input;
      await inputStream.cancel();

      let advertiseRefGenerator: AsyncGenerator<Buffer, void, void>;
      const stream = new ReadableStream({
        start: async () => {
          advertiseRefGenerator = gitHttp.advertiseRefGenerator({
            fs: fs as any,
            dir,
            gitDir,
          });
        },
        pull: async (controller) => {
          const result = await advertiseRefGenerator.next();
          if (result.done) {
            controller.close();
            return;
          } else {
            controller.enqueue(result.value);
          }
        },
        cancel: async (reason) => {
          await advertiseRefGenerator.throw(reason).catch(() => {});
        },
      });
      return [{}, stream];
    };
  }

  class GitPackHandler extends RawHandler<{
    fs: EncryptedFS;
    dir: string;
    gitDir: string;
  }> {
    public handle = async (
      input: [JSONRPCRequest, ReadableStream<Uint8Array>],
    ): Promise<[JSONObject, ReadableStream<Uint8Array>]> => {
      const { fs, dir, gitDir } = this.container;
      const [, inputStream] = input;

      let gitPackgenerator: AsyncGenerator<Buffer, void, void>;
      const stream = new ReadableStream({
        start: async () => {
          const body: Array<Buffer> = [];
          for await (const message of inputStream) {
            body.push(Buffer.from(message));
          }
          gitPackgenerator = gitHttp.generatePackRequest({
            fs: fs as any,
            dir,
            gitDir,
            body,
          });
        },
        pull: async (controller) => {
          const result = await gitPackgenerator.next();
          if (result.done) {
            controller.close();
            return;
          } else {
            controller.enqueue(result.value);
          }
        },
        cancel: async (reason) => {
          await gitPackgenerator.throw(reason).catch(() => {});
        },
      });
      return [{}, stream];
    };
  }

  // Creating RPC
  const rpcServer = new RPCServer({
    logger: logger.getChild('RPCServer'),
  });
  await rpcServer.start({
    manifest: {
      gitAdvertiseFs: new GitAdvertiseHandler(gitDirsFs),
      gitAdvertiseEfs: new GitAdvertiseHandler(gitDirsEfs),
      gitPackFs: new GitPackHandler(gitDirsFs),
      gitPackEfs: new GitPackHandler(gitDirsEfs),
    },
  });

  function createPassthroughStream<A, B>() {
    const forwardPass = new TransformStream<Uint8Array>({
      transform: (chunk, controller) => {
        // Console.log('forward -- ', chunk.toString());
        controller.enqueue(chunk);
      },
    });
    const reversePass = new TransformStream<Uint8Array>({
      transform: (chunk, controller) => {
        // Console.log('reverse -- ', chunk.toString());
        controller.enqueue(chunk);
      },
    });
    const clientPair: ReadableWritablePair<Uint8Array, Uint8Array> = {
      readable: reversePass.readable,
      writable: forwardPass.writable,
    };
    const serverPair: ReadableWritablePair<Uint8Array, Uint8Array> = {
      readable: forwardPass.readable,
      writable: reversePass.writable,
    };
    return {
      clientPair,
      serverPair,
    };
  }

  const rpcClient = new RPCClient({
    manifest: {
      gitAdvertiseFs: new RawCaller(),
      gitAdvertiseEfs: new RawCaller(),
      gitPackFs: new RawCaller(),
      gitPackEfs: new RawCaller(),
    },
    async streamFactory(
      ctx: ContextTimed,
    ): Promise<RPCStream<Uint8Array, Uint8Array>> {
      const { clientPair, serverPair } = createPassthroughStream<
        Uint8Array,
        Uint8Array
      >();
      rpcServer.handleStream({
        ...serverPair,
        cancel: () => {},
      });
      return {
        ...clientPair,
        cancel: () => {},
      };
    },
  });

  function request({ type }: { type: 'fs' | 'efs' }) {
    return async ({
      url,
      method = 'GET',
      headers = {},
      body = [Buffer.from('')],
    }: {
      url: string;
      method: string;
      headers: POJO;
      body: Array<Buffer>;
    }) => {
      // Console.log('body', body.map(v => v.toString()))
      if (method === 'GET') {
        // Send back the GET request info response
        const advertiseRefResponse =
          type === 'fs'
            ? await rpcClient.methods.gitAdvertiseFs({})
            : await rpcClient.methods.gitAdvertiseEfs({});
        // Await advertiseRefResponse.writable.close();

        return {
          url: url,
          method: method,
          body: advertiseRefResponse.readable,
          headers: headers,
          statusCode: 200,
          statusMessage: 'OK',
        };
      } else if (method === 'POST') {
        const packResponse =
          type === 'fs'
            ? await rpcClient.methods.gitPackFs({})
            : await rpcClient.methods.gitPackEfs({});
        const writer = packResponse.writable.getWriter();
        for (const buffer of body) await writer.write(buffer);
        await writer.close();

        return {
          url: url,
          method: method,
          body: packResponse.readable,
          headers: headers,
          statusCode: 200,
          statusMessage: 'OK',
        };
      } else {
        utils.never();
      }
    };
  }

  const summary = await b.suite(
    summaryName(__filename),
    b.add('git clone with fs', async () => {
      await git.clone({
        fs,
        dir: gitDirsFs.dir,
        http: { request: gitTestUtils.request(gitDirsFs) },
        url: 'http://',
      });
    }),
    b.add('git clone with efs', async () => {
      await git.clone({
        fs: efs,
        dir: gitDirsEfs.dir,
        http: { request: gitTestUtils.request(gitDirsEfs) },
        url: 'http://',
      });
    }),
    b.add('git clone with fs + rpc', async () => {
      await git.clone({
        fs: efs,
        dir: gitDirsEfs.dir,
        http: { request: request({ type: 'fs' }) },
        url: 'http://',
      });
    }),
    b.add('git clone with efs + rpc', async () => {
      await git.clone({
        fs: efs,
        dir: gitDirsEfs.dir,
        http: { request: request({ type: 'efs' }) },
        url: 'http://',
      });
    }),
    ...suiteCommon,
  );
  return summary;
}

if (require.main === module) {
  void main();
}

export default main;
