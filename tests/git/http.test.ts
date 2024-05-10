import type { POJO } from '@';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import git from 'isomorphic-git';
import { test } from '@fast-check/jest';
import fc from 'fast-check';
import * as gitHttp from '@/git/http';
import * as validationErrors from '@/validation/errors';
import * as utils from '@/utils';
import * as gitTestUtils from './utils';

describe('Git Http', () => {
  const _logger = new Logger('Git Http Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let gitDirs: {
    fs: any; // Any here to act as fs or the efs since the overlap enough for testing
    dir: string;
    gitDir: string;
    gitdir: string;
  };
  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const dir = path.join(dataDir, 'repository');
    const gitdir = path.join(dir, '.git');
    gitDirs = {
      fs,
      dir,
      gitDir: gitdir,
      gitdir,
    };
  });
  afterAll(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('packetLine', async () => {
    /**
     *   Pkt-line          actual value
     *   ---------------------------------
     *   "0006a\n"         "a\n"
     *   "0005a"           "a"
     *   "000bfoobar\n"    "foobar\n"
     *   "0004"            ""
     */
    const tests = [
      ['0006a\n', 'a\n'],
      ['0005a', 'a'],
      ['000bfoobar\n', 'foobar\n'],
      ['0004', ''],
    ];
    for (const [output, input] of tests) {
      const result = gitHttp.packetLineBuffer(Buffer.from(input));
      const comp = Buffer.compare(result, Buffer.from(output));
      expect(comp).toBe(0);
    }
  });
  test('packetLineWithChannel', async () => {
    /**
     *   Pkt-line          actual value
     *   ---------------------------------
     *   "0007a\n"         "a\n"
     *   "0006a"           "a"
     *   "000cfoobar\n"    "foobar\n"
     *   "0005"            ""
     */
    const tests = [
      ['0007\x01a\n', 'a\n'],
      ['0006\x01a', 'a'],
      ['000c\x01foobar\n', 'foobar\n'],
      ['0005\x01', ''],
    ];
    for (const [output, input] of tests) {
      const result = gitHttp.packetLineBuffer(Buffer.from(input), 1);
      const comp = Buffer.compare(result, Buffer.from(output));
      expect(comp).toBe(0);
    }
  });
  test('advertiseRefGenerator', async () => {
    await gitTestUtils.createGitRepo({
      ...gitDirs,
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
    });
    const gen = gitHttp.advertiseRefGenerator(gitDirs);
    let response = '';
    for await (const result of gen) {
      response += result.toString();
    }
    // Header
    expect(response).toInclude('001e# service=git-upload-pack\n');
    // Includes flush packets
    expect(response).toInclude('0000');
    // Includes capabilities
    expect(response).toIncludeMultiple([
      'side-band-64k',
      'symref=HEAD:refs/heads/master',
      'agent=git/isomorphic-git@1.8.1',
    ]);
    // HEAD commit is listed twice as `HEAD` and `master`
    const headCommit = (await git.log({ ...gitDirs, ref: 'HEAD' }))[0].oid;
    expect(response).toIncludeRepeated(headCommit, 2);
    // `HEAD` and `master` are both listed
    expect(response).toIncludeMultiple(['HEAD', 'master']);
    // A null byte is included to delimit first line and capabilities
    expect(response).toInclude('\0');
  });
  test('parsePackRequest', async () => {
    const data = Buffer.from(
      `0060want aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa side-band-64k agent=git/isomorphic-git@1.24.5\n0032have bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n00000009done\n`,
    );
    const [wants, haves, capabilities] = await gitHttp.parsePackRequest([data]);
    expect(wants).toMatchObject(['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']);
    expect(haves).toMatchObject(['bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb']);
    expect(capabilities).toMatchObject([
      'side-band-64k',
      'agent=git/isomorphic-git@1.24.5',
    ]);
  });
  test.prop([fc.uint8Array({ minLength: 100 })])(
    'parsePackRequest handles random data',
    async (data) => {
      await expect(
        gitHttp.parsePackRequest([Buffer.from(data)]),
      ).rejects.toThrow(validationErrors.ErrorParse);
    },
  );
  test('generatePackData', async () => {
    await gitTestUtils.createGitRepo({
      ...gitDirs,
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
    });
    const objectIds = await gitTestUtils.listGitObjects(gitDirs);
    const gen = gitHttp.generatePackData({
      ...gitDirs,
      objectIds,
    });
    let acc = Buffer.alloc(0);
    for await (const line of gen) {
      acc = Buffer.concat([acc, line.subarray(5)]);
    }
    const packPath = path.join(gitDirs.dir, 'pack');
    await fs.promises.writeFile(packPath, acc);
    // Checking that all objectIds are included and packFile is valid using isometric git
    const result = await git.indexPack({
      ...gitDirs,
      filepath: 'pack',
    });
    expect(result.oids).toIncludeAllMembers(objectIds);
  });
  test('generatePackRequest', async () => {
    await gitTestUtils.createGitRepo({
      ...gitDirs,
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
    });
    const gen = gitHttp.generatePackRequest({
      ...gitDirs,
      body: [],
    });
    let response = '';
    for await (const line of gen) {
      response += line.toString();
    }
    // NAK response for no common objects
    expect(response).toInclude('0008NAK\n');
    // Pack data included on chanel 1
    expect(response).toInclude('\x01PACK');
    // Progress data included on chanel 2
    expect(response).toInclude('0017\x02progress is at 50%');
    // Flush packet included
    expect(response).toInclude('0000');
  });
  test('end to end clone', async () => {
    await gitTestUtils.createGitRepo({
      ...gitDirs,
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
    });

    const request = async function ({
      url,
      method = 'GET',
      headers = {},
      body = [Buffer.from('')],
    }: {
      url: string;
      method: string;
      headers: POJO;
      body: Array<Buffer>;
    }) {
      if (method === 'GET') {
        // Send back the GET request info response
        const advertiseRefGen = gitHttp.advertiseRefGenerator(gitDirs);

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
          ...gitDirs,
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
    const newDir = path.join(dataDir, 'newRepo');
    const newDirs = {
      fs,
      dir: newDir,
      gitdir: path.join(newDir, '.git'),
      gitDir: path.join(newDir, '.git'),
    };

    await git.clone({
      fs,
      dir: newDir,
      http: { request },
      url: 'http://',
    });
    // Files are checked out and correct
    expect(
      (await fs.promises.readFile(path.join(newDirs.dir, 'file1'))).toString(),
    ).toBe('this is a changed file');
    expect(
      (await fs.promises.readFile(path.join(newDirs.dir, 'file2'))).toString(),
    ).toBe('this is another file');
  });
});
