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

/**
 * This will generate a request line that would be sent by the git client when requesting objects.
 * It is explicitly used to generate test data for the `parseRequestLine` code.
 *
 * @param data - type of line with data to be generated
 * @param rest - Random buffer data to be appended to the end to simulate more lines in the stream.
 */
function generateGitNegotiationLine(data: NegotiationTestData, rest: Buffer) {
  switch (data.type) {
    case 'want': {
      // Generate a `want` line that includes `want`, the `objectId` and capabilities
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
      // Generate a `have` line indicating an object that doesn't need to be sent
      const line = Buffer.concat([
        Buffer.from(data.type),
        gitUtils.SPACE_BUFFER,
        Buffer.from(data.objectId),
        gitUtils.LINE_FEED_BUFFER,
      ]);
      return Buffer.concat([gitHttp.packetLineBuffer(line), rest]);
    }
    case 'SEPARATOR':
      // Generate a `0000` flush packet
      return Buffer.concat([Buffer.from('0000'), rest]);
    case 'done':
      // Generate a `done` packet.
      return Buffer.concat([Buffer.from('0009done\n'), rest]);
    case 'none':
      // Generate an empty buffer to simulate the stream running out of data to process
      return Buffer.alloc(0);
    default:
      utils.never();
  }
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

// Generates a git objectId in the form of a 40-digit hex number
const gitObjectIdArb = fc.hexaString({
  maxLength: 40,
  minLength: 40,
});
// Generates a list of capabilities, theses are just random valid strings
const gitCapabilityListArb = fc.array(
  fc.stringOf(
    fc.constantFrom(...`abcdefghijklmnopqrstuvwxyz-1234567890`.split('')),
    { minLength: 5 },
  ),
  { size: 'small' },
);
// Generates git request data used for testing `parseRequestLine`
const gitRequestDataArb = fc.oneof(
  fc.record({
    type: fc.constant('want') as Arbitrary<'want'>,
    objectId: gitObjectIdArb,
    capabilityList: gitCapabilityListArb,
  }),
  fc.record({
    type: fc.constant('have') as Arbitrary<'have'>,
    objectId: gitObjectIdArb,
  }),
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
  generateGitNegotiationLine,
  request,
  gitObjectIdArb,
  gitCapabilityListArb,
  gitRequestDataArb,
};
