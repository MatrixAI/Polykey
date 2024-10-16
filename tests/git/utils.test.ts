import fs from 'fs';
import os from 'os';
import path from 'path';
import git from 'isomorphic-git';
import { test } from '@fast-check/jest';
import fc from 'fast-check';
import * as gitUtils from '@/git/utils';
import * as validationErrors from '@/validation/errors';
import * as gitTestUtils from './utils';

describe('Git utils', () => {
  let dataDir: string;
  let gitDirs: {
    efs: any; // Any here to act as fs or the efs since the overlap enough for testing
    fs: any;
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
      efs: fs,
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
    const expectedReferences = ['HEAD', 'refs/heads/master'];
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
    const expectedObjectIds = await gitUtils.listObjectsAll(gitDirs);
    // Found objects should include all the commits
    expect(objectList).toIncludeAllMembers(commitIds);
    // Since it was an exhaustive walk of all commits, all objectIds should be included
    expect(objectList).toIncludeAllMembers(expectedObjectIds);
  });
  test.prop([
    gitTestUtils.gitRequestDataArb,
    fc.uint8Array({ size: 'medium' }),
  ])('parseRequestLine', async (lineData, rest) => {
    const data = gitTestUtils.generateGitNegotiationLine(
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
  });
  test.prop([fc.uint8Array({ size: 'medium', minLength: 1 }).noShrink()])(
    'parseRequestLine handles bad data',
    async (randomData) => {
      const bufferData = Buffer.from(randomData);
      fc.pre(!/^[0-9a-f]{4}$/.test(bufferData.subarray(0, 4).toString()));
      expect(() => gitUtils.parseRequestLine(bufferData)).toThrow(
        validationErrors.ErrorParse,
      );
    },
  );
});
