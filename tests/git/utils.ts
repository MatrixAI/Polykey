import type { POJO } from '@';
import type { CapabilityList } from '@/git/types';
import type { Arbitrary } from 'fast-check';
import type { EncryptedFS } from 'encryptedfs';
import path from 'path';
import git from 'isomorphic-git';
import fc from 'fast-check';
import * as gitUtils from '@/git/utils';
import * as gitHttp from '@/git/http';
import * as utils from '@/utils';

/**
 * Utility for quickly creating a git repo with history
 */
async function createGitRepo({
  efs,
  dir,
  gitdir,
  author,
  commits,
  init = true,
}: {
  efs: EncryptedFS;
  dir: string;
  gitdir: string;
  author: string;
  commits: Array<{
    message: string;
    files: Array<{ name: string; contents: string }>;
  }>;
  init?: boolean;
}) {
  const gitDirs = {
    fs: efs,
    dir,
    gitdir,
  };
  const authorDetails = {
    author: {
      name: author,
      email: `${author}@test.com`,
    },
    committer: {
      name: author,
      email: `${author}@test.com`,
    },
  };
  if (init) {
    await git.init({
      ...gitDirs,
    });
  }
  for (const { message, files } of commits) {
    await Promise.all(
      files.map(({ name, contents }) =>
        efs.promises.writeFile(path.join(gitDirs.dir, name), contents),
      ),
    );
    await git.add({
      ...gitDirs,
      filepath: files.map(({ name }) => name),
    });
    await git.commit({
      ...gitDirs,
      ...authorDetails,
      message,
    });
  }
}

const objectsDirName = 'objects';
const excludedDirs = ['pack', 'info'];

/**
 * Walks the filesystem to list out all git objects in the objects directory
 * @param fs
 * @param gitDir
 */
async function listGitObjects({
  efs,
  gitDir,
}: {
  efs: EncryptedFS;
  gitDir: string;
}) {
  const objectsDirPath = path.join(gitDir, objectsDirName);
  const objectSet: Set<string> = new Set();
  const objectDirs = await efs.promises.readdir(objectsDirPath);
  for (const objectDir of objectDirs) {
    if (typeof objectDir !== 'string') {
      utils.never('objectDir should be a string');
    }
    if (excludedDirs.includes(objectDir)) continue;
    const objectIds = await efs.promises.readdir(
      path.join(objectsDirPath, objectDir),
    );
    for (const objectId of objectIds) {
      objectSet.add(objectDir + objectId);
    }
  }
  return [...objectSet];
}

type NegotiationTestData =
  | {
      type: 'want';
      objectId: string;
      capabilityList: CapabilityList;
    }
  | {
      type: 'have';
      objectId: string;
    }
  | {
      type: 'SEPARATOR' | 'done' | 'none';
    };

function generateTestNegotiationLine(data: NegotiationTestData, rest: Buffer) {
  switch (data.type) {
    case 'want': {
      const line = Buffer.concat([
        Buffer.from(data.type),
        gitUtils.SPACE_BUFFER,
        Buffer.from(data.objectId),
        gitUtils.SPACE_BUFFER,
        Buffer.from(data.capabilityList.join(gitUtils.SPACE_STRING)),
        gitUtils.LINE_FEED_BUFFER,
      ]);
      return Buffer.concat([gitHttp.packetLineBuffer(line), rest]);
    }
    case 'have': {
      const line = Buffer.concat([
        Buffer.from(data.type),
        gitUtils.SPACE_BUFFER,
        Buffer.from(data.objectId),
        gitUtils.LINE_FEED_BUFFER,
      ]);
      return Buffer.concat([gitHttp.packetLineBuffer(line), rest]);
    }
    case 'SEPARATOR':
      return Buffer.concat([Buffer.from('0000'), rest]);
    case 'done':
      return Buffer.concat([Buffer.from('0009done\n'), rest]);
    case 'none':
      return Buffer.alloc(0);
    default:
      utils.never();
  }
}

// Used to print out the contents of an `Buffer` iterable for testing
async function* tapGen(
  gen: AsyncIterable<Buffer>,
): AsyncGenerator<Buffer, void, void> {
  let acc = '';
  for await (const line of gen) {
    acc += line.toString();
    yield line;
  }
  // eslint-disable-next-line no-console
  console.log(acc);
}

/**
 * Create a test request handler for use with `git.clone` and `git.pull`
 */
function request({
  efs,
  dir,
  gitDir,
}: {
  efs: EncryptedFS;
  dir: string;
  gitDir: string;
}) {
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
      const advertiseRefGen = gitHttp.advertiseRefGenerator({
        efs,
        dir,
        gitDir,
      });

      return {
        url: url,
        method: method,
        body: advertiseRefGen,
        headers: headers,
        statusCode: 200,
        statusMessage: 'OK',
      };
    } else if (method === 'POST') {
      const packGen = gitHttp.generatePackRequest({
        efs,
        dir,
        gitDir,
        body,
      });
      return {
        url: url,
        method: method,
        body: packGen,
        headers: headers,
        statusCode: 200,
        statusMessage: 'OK',
      };
    } else {
      utils.never();
    }
  };
}

const objectIdArb = fc.hexaString({
  maxLength: 40,
  minLength: 40,
});
const capabilityArb = fc.stringOf(
  fc.constantFrom(...`abcdefghijklmnopqrstuvwxyz-1234567890`.split('')),
  { minLength: 5 },
);
const capabilityListArb = fc.array(capabilityArb, { size: 'small' });
const restArb = fc.uint8Array();
const wantArb = fc.record({
  type: fc.constant('want') as Arbitrary<'want'>,
  objectId: objectIdArb,
  capabilityList: capabilityListArb,
});
const haveArb = fc.record({
  type: fc.constant('have') as Arbitrary<'have'>,
  objectId: objectIdArb,
});

const lineDataArb = fc.oneof(
  wantArb,
  haveArb,
  fc.record({
    type: fc.constantFrom<'SEPARATOR' | 'done' | 'none'>(
      'SEPARATOR',
      'done',
      'none',
    ),
  }),
);

export {
  createGitRepo,
  listGitObjects,
  generateTestNegotiationLine,
  tapGen,
  request,
  objectIdArb,
  capabilityArb,
  capabilityListArb,
  restArb,
  wantArb,
  haveArb,
  lineDataArb,
};
