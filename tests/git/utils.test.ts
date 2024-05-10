import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import git from 'isomorphic-git';
import { test } from '@fast-check/jest';
import fc from 'fast-check';
import * as gitUtils from '@/git/utils';
import * as validationErrors from '@/validation/errors';
import * as gitTestUtils from './utils';

describe('Git utils', () => {
  const _logger = new Logger('Git utils Test', LogLevel.WARN, [
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

  test('listReferencesGenerator', async () => {
    // Start with creating a git repo with commits
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

    const headObjectId = (
      await git.log({
        ...gitDirs,
        depth: 1,
      })
    )[0].oid;
    const expectedReferences = ['HEAD', 'master'];
    for await (const [reference, objectId] of gitUtils.listReferencesGenerator({
      ...gitDirs,
    })) {
      expect(reference).toBeOneOf(expectedReferences);
      expect(objectId).toBe(headObjectId);
    }
  });
  test('refCapability', async () => {
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
    const branches = await git.listBranches({ ...gitDirs });
    for (const reference of ['HEAD', ...branches]) {
      const referenceCapability = await gitUtils.referenceCapability({
        ...gitDirs,
        reference,
      });
      // Includes the `symref` indicator of the capability
      expect(referenceCapability).toInclude('symref=');
      // The `:` separator
      expect(referenceCapability).toInclude(':');
      // No spaces
      expect(referenceCapability).not.toInclude(' ');
    }
  });
  test('listObjects', async () => {
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

    const commitIds = (
      await git.log({
        ...gitDirs,
        ref: 'HEAD',
      })
    ).map((v) => v.oid);

    const objectList = await gitUtils.listObjects({
      ...gitDirs,
      wants: commitIds,
      haves: [],
    });
    const expectedObjectIds = await gitTestUtils.listGitObjects(gitDirs);
    // Found objects should include all the commits
    expect(objectList).toIncludeAllMembers(commitIds);
    // Since it was an exhaustive walk of all commits, all objectIds should be included
    expect(objectList).toIncludeAllMembers(expectedObjectIds);
  });
  test.prop([gitTestUtils.lineDataArb, gitTestUtils.restArb])(
    'parseRequestLine',
    async (lineData, rest) => {
      const data = gitTestUtils.generateTestNegotiationLine(
        lineData,
        Buffer.from(rest),
      );
      const result = gitUtils.parseRequestLine(data);
      switch (lineData.type) {
        case 'want':
          {
            expect(result).toBeDefined();
            const [type, objectId, capabilityList, resultRest] = result!;
            expect(type).toBe(lineData.type);
            expect(objectId).toBe(lineData.objectId);
            expect(capabilityList).toMatchObject(lineData.capabilityList);
            expect(Buffer.compare(resultRest, rest)).toBe(0);
          }
          break;
        case 'have':
          {
            expect(result).toBeDefined();
            const [type, objectId, capabilityList, resultRest] = result!;
            expect(type).toBe(lineData.type);
            expect(objectId).toBe(lineData.objectId);
            expect(capabilityList.length).toBe(0);
            expect(Buffer.compare(resultRest, rest)).toBe(0);
          }
          break;
        case 'SEPARATOR':
        case 'done':
          {
            expect(result).toBeDefined();
            const [type, objectId, capabilityList, resultRest] = result!;
            expect(type).toBe(lineData.type);
            expect(objectId).toBe('');
            expect(capabilityList.length).toBe(0);
            expect(Buffer.compare(resultRest, rest)).toBe(0);
          }
          break;
        case 'none':
          {
            expect(result).toBeUndefined();
          }
          break;
      }
    },
  );
  test.prop([fc.uint8Array({ size: 'medium', minLength: 1 }).noShrink()])(
    'parseRequestLine handles bad data',
    async (randomData) => {
      expect(() => gitUtils.parseRequestLine(Buffer.from(randomData))).toThrow(
        validationErrors.ErrorParse,
      );
    },
  );
});
