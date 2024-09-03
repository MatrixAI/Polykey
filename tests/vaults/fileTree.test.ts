import type { ContentNode, FileTree } from '@/vaults/types';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ReadableStream } from 'stream/web';
import { test } from '@fast-check/jest';
import fc from 'fast-check';
import * as fileTree from '@/vaults/fileTree';
import * as vaultsTestUtils from './utils';

describe('fileTree', () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
  });
  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  describe('globWalk', () => {
    let cwd: string;

    const relativeBase = '.';
    const dir1: string = 'dir1';
    const dir2: string = 'dir2';
    const dir11: string = path.join(dir1, 'dir11');
    const dir12: string = path.join(dir1, 'dir12');
    const dir21: string = path.join(dir2, 'dir21');
    const dir22: string = path.join(dir2, 'dir22');
    const file0b: string = 'file0.b';
    const file1a: string = path.join(dir11, 'file1.a');
    const file2b: string = path.join(dir11, 'file2.b');
    const file3a: string = path.join(dir12, 'file3.a');
    const file4b: string = path.join(dir12, 'file4.b');
    const file5a: string = path.join(dir21, 'file5.a');
    const file6b: string = path.join(dir21, 'file6.b');
    const file7a: string = path.join(dir22, 'file7.a');
    const file8b: string = path.join(dir22, 'file8.b');
    const file9a: string = path.join(dir22, 'file9.a');

    beforeEach(async () => {
      await fs.promises.mkdir(path.join(dataDir, dir1));
      await fs.promises.mkdir(path.join(dataDir, dir11));
      await fs.promises.mkdir(path.join(dataDir, dir12));
      await fs.promises.mkdir(path.join(dataDir, dir2));
      await fs.promises.mkdir(path.join(dataDir, dir21));
      await fs.promises.mkdir(path.join(dataDir, dir22));
      await fs.promises.writeFile(path.join(dataDir, file0b), 'content-file0');
      await fs.promises.writeFile(path.join(dataDir, file1a), 'content-file1');
      await fs.promises.writeFile(path.join(dataDir, file2b), 'content-file2');
      await fs.promises.writeFile(path.join(dataDir, file3a), 'content-file3');
      await fs.promises.writeFile(path.join(dataDir, file4b), 'content-file4');
      await fs.promises.writeFile(path.join(dataDir, file5a), 'content-file5');
      await fs.promises.writeFile(path.join(dataDir, file6b), 'content-file6');
      await fs.promises.writeFile(path.join(dataDir, file7a), 'content-file7');
      await fs.promises.writeFile(path.join(dataDir, file8b), 'content-file8');
      await fs.promises.writeFile(path.join(dataDir, file9a), 'content-file9');
      cwd = process.cwd();
      process.chdir(dataDir);
    });
    afterEach(async () => {
      process.chdir(cwd);
    });

    test('Works with relative base path `.`', async () => {
      const tree: FileTree = [];
      for await (const treeNode of fileTree.globWalk({
        fs: fs,
        basePath: relativeBase,
        yieldDirectories: true,
        yieldFiles: true,
        yieldParents: true,
        yieldRoot: true,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).toContainAllValues([
        relativeBase,
        dir1,
        dir2,
        dir11,
        dir12,
        dir21,
        dir22,
        file0b,
        file1a,
        file2b,
        file3a,
        file4b,
        file5a,
        file6b,
        file7a,
        file8b,
        file9a,
      ]);
    });
    test('Works with relative base path `./`', async () => {
      const tree: FileTree = [];
      for await (const treeNode of fileTree.globWalk({
        fs: fs,
        basePath: './',
        yieldDirectories: true,
        yieldFiles: true,
        yieldParents: true,
        yieldRoot: true,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).toContainAllValues([
        './',
        dir1,
        dir2,
        dir11,
        dir12,
        dir21,
        dir22,
        file0b,
        file1a,
        file2b,
        file3a,
        file4b,
        file5a,
        file6b,
        file7a,
        file8b,
        file9a,
      ]);
    });
    test('Works with relative base path `./dir1`', async () => {
      const tree: FileTree = [];
      for await (const treeNode of fileTree.globWalk({
        fs: fs,
        basePath: './dir1',
        yieldDirectories: true,
        yieldFiles: true,
        yieldParents: true,
        yieldRoot: true,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).toContainAllValues([
        dir1,
        dir11,
        dir12,
        file1a,
        file2b,
        file3a,
        file4b,
      ]);
    });
    test('Works with absolute base path', async () => {
      const tree: FileTree = [];
      for await (const treeNode of fileTree.globWalk({
        fs: fs,
        basePath: dataDir,
        yieldDirectories: true,
        yieldFiles: true,
        yieldParents: true,
        yieldRoot: true,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).toContainAllValues(
        [
          relativeBase,
          dir1,
          dir2,
          dir11,
          dir12,
          dir21,
          dir22,
          file0b,
          file1a,
          file2b,
          file3a,
          file4b,
          file5a,
          file6b,
          file7a,
          file8b,
          file9a,
        ].map((v) => path.join(dataDir, v)),
      );
    });
    test('Yields parent directories with `yieldParents`', async () => {
      const tree: FileTree = [];
      for await (const treeNode of fileTree.globWalk({
        fs: fs,
        basePath: relativeBase,
        yieldParents: true,
        yieldFiles: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).toContainAllValues([
        relativeBase,
        dir2,
        dir1,
        dir11,
        dir12,
        dir21,
        dir22,
      ]);
    });
    test('Does not yield the base path with `yieldParents` and `yieldRoot`', async () => {
      const tree: FileTree = [];
      for await (const treeNode of fileTree.globWalk({
        fs: fs,
        basePath: relativeBase,
        yieldRoot: false,
        yieldParents: true,
        yieldFiles: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).not.toInclude(relativeBase);
      expect(files).toContainAllValues([
        dir2,
        dir1,
        dir11,
        dir12,
        dir21,
        dir22,
      ]);
    });
    test('Does not yield the base path with `yieldParents` and `yieldRoot` and absolute paths', async () => {
      const tree: FileTree = [];
      for await (const treeNode of fileTree.globWalk({
        fs: fs,
        basePath: dataDir,
        yieldRoot: false,
        yieldParents: true,
        yieldFiles: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).not.toInclude(dataDir);
      expect(files).toContainAllValues(
        [dir2, dir1, dir11, dir12, dir21, dir22].map((v) =>
          path.join(dataDir, v),
        ),
      );
    });
    test('Yields stats with `yieldStats`', async () => {
      const tree: FileTree = [];
      for await (const treeNode of fileTree.globWalk({
        fs: fs,
        basePath: relativeBase,
        yieldStats: true,
        yieldFiles: true,
        yieldDirectories: true,
      })) {
        tree.push(treeNode);
      }
      tree.forEach((v) => expect(v.stat).toBeDefined());
    });
    // Globbing examples
    test('glob with wildcard', async () => {
      const tree: FileTree = [];
      for await (const treeNode of fileTree.globWalk({
        fs: fs,
        basePath: relativeBase,
        pattern: '*',
        yieldFiles: true,
        yieldDirectories: true,
        yieldParents: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).toContainAllValues([dir1, dir2, file0b]);
    });
    test('glob with wildcard ignores directories with `yieldDirectories: false`', async () => {
      const tree: FileTree = [];
      for await (const treeNode of fileTree.globWalk({
        fs: fs,
        basePath: relativeBase,
        pattern: '*',
        yieldFiles: true,
        yieldDirectories: false,
        yieldParents: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).not.toContainAllValues([relativeBase, dir1, dir2]);
      expect(files).toContainAllValues([file0b]);
    });
    test('glob with wildcard ignores files with `yieldFiles: false`', async () => {
      const tree: FileTree = [];
      for await (const treeNode of fileTree.globWalk({
        fs: fs,
        basePath: relativeBase,
        pattern: '*',
        yieldFiles: false,
        yieldDirectories: true,
        yieldParents: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).not.toContainAllValues([file0b]);
      expect(files).toContainAllValues([dir1, dir2]);
    });
    test('glob with globstar', async () => {
      const tree: FileTree = [];
      for await (const treeNode of fileTree.globWalk({
        fs: fs,
        basePath: relativeBase,
        pattern: '**',
        yieldFiles: true,
        yieldDirectories: true,
        yieldParents: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).not.toInclude(relativeBase);
      expect(files).toContainAllValues([
        dir1,
        dir2,
        file0b,
        dir11,
        dir12,
        dir21,
        dir22,
        file1a,
        file2b,
        file3a,
        file4b,
        file5a,
        file6b,
        file7a,
        file8b,
        file9a,
      ]);
    });
    test('glob with globstar and directory pattern', async () => {
      const tree: FileTree = [];
      for await (const treeNode of fileTree.globWalk({
        fs: fs,
        basePath: relativeBase,
        pattern: '**/dir2/**',
        yieldFiles: true,
        yieldDirectories: true,
        yieldParents: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).not.toContainAllValues([
        relativeBase,
        dir1,
        dir2,
        file0b,
        dir11,
        dir12,
        file1a,
        file2b,
        file3a,
        file4b,
      ]);
      expect(files).toContainAllValues([
        dir21,
        dir22,
        file5a,
        file6b,
        file7a,
        file8b,
        file9a,
      ]);
    });
    test('glob with globstar and wildcard', async () => {
      const tree: FileTree = [];
      for await (const treeNode of fileTree.globWalk({
        fs: fs,
        basePath: relativeBase,
        pattern: '**/*.a',
        yieldFiles: true,
        yieldDirectories: true,
        yieldParents: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).not.toContainAllValues([
        relativeBase,
        dir1,
        dir2,
        file0b,
        dir11,
        dir12,
        dir21,
        dir22,
        file2b,
        file4b,
        file6b,
        file8b,
      ]);
      expect(files).toContainAllValues([
        file1a,
        file3a,
        file5a,
        file7a,
        file9a,
      ]);
    });
  });
  describe('parsers and generators', () => {
    test.prop([vaultsTestUtils.headerGenericArb])(
      'generic header',
      async (genericHeader) => {
        const data = fileTree.generateGenericHeader(genericHeader);
        const result = fileTree.parseGenericHeader(data);
        expect(result.data).toMatchObject(genericHeader);
      },
    );
    test.prop([vaultsTestUtils.headerContentArb])(
      'content header',
      async (contentHeader) => {
        const data = fileTree.generateContentHeader(contentHeader);
        const result = fileTree.parseContentHeader(data);
        expect(result.data).toMatchObject(contentHeader);
        expect(result.remainder.byteLength).toBe(0);
      },
    );
  });
  describe('serializer', () => {
    let cwd: string;

    const dir1: string = 'dir1';
    const dir2: string = 'dir2';
    const dir11: string = path.join(dir1, 'dir11');
    const dir12: string = path.join(dir1, 'dir12');
    const dir21: string = path.join(dir2, 'dir21');
    const dir22: string = path.join(dir2, 'dir22');
    const file0b: string = 'file0.b';
    const file1a: string = path.join(dir11, 'file1.a');
    const file2b: string = path.join(dir11, 'file2.b');
    const file3a: string = path.join(dir12, 'file3.a');
    const file4b: string = path.join(dir12, 'file4.b');
    const file5a: string = path.join(dir21, 'file5.a');
    const file6b: string = path.join(dir21, 'file6.b');
    const file7a: string = path.join(dir22, 'file7.a');
    const file8b: string = path.join(dir22, 'file8.b');
    const file9a: string = path.join(dir22, 'file9.a');

    beforeEach(async () => {
      await fs.promises.mkdir(path.join(dataDir, dir1));
      await fs.promises.mkdir(path.join(dataDir, dir11));
      await fs.promises.mkdir(path.join(dataDir, dir12));
      await fs.promises.mkdir(path.join(dataDir, dir2));
      await fs.promises.mkdir(path.join(dataDir, dir21));
      await fs.promises.mkdir(path.join(dataDir, dir22));
      await fs.promises.writeFile(path.join(dataDir, file0b), 'content-file0');
      await fs.promises.writeFile(path.join(dataDir, file1a), 'content-file1');
      await fs.promises.writeFile(path.join(dataDir, file2b), 'content-file2');
      await fs.promises.writeFile(path.join(dataDir, file3a), 'content-file3');
      await fs.promises.writeFile(path.join(dataDir, file4b), 'content-file4');
      await fs.promises.writeFile(path.join(dataDir, file5a), 'content-file5');
      await fs.promises.writeFile(path.join(dataDir, file6b), 'content-file6');
      await fs.promises.writeFile(path.join(dataDir, file7a), 'content-file7');
      await fs.promises.writeFile(path.join(dataDir, file8b), 'content-file8');
      await fs.promises.writeFile(path.join(dataDir, file9a), 'content-file9');
      cwd = process.cwd();
      process.chdir(dataDir);
    });
    afterEach(async () => {
      process.chdir(cwd);
    });

    // TODO:
    //  - Add test for testing serializer on vaults fs.

    test('sends single tree', async () => {
      const fileTreeGen = fileTree.globWalk({
        fs,
        yieldStats: false,
        yieldRoot: false,
        yieldFiles: true,
        yieldParents: true,
        yieldDirectories: true,
      });
      const data: Array<ContentNode | Uint8Array> = [];
      const parserTransform = fileTree.parserTransformStreamFactory();
      const serializedStream = fileTree.serializerStreamFactory(
        fs,
        fileTreeGen,
      );
      const outputStream = serializedStream.pipeThrough(parserTransform);
      for await (const output of outputStream) {
        data.push(output);
      }
      const paths = data.map((v) => {
        fileTree.parseTreeNode(v);
        return v.path;
      });
      expect(paths).toIncludeAllMembers([
        dir1,
        dir2,
        dir11,
        dir12,
        dir21,
        dir22,
        file0b,
        file1a,
        file2b,
        file3a,
        file4b,
        file5a,
        file6b,
        file7a,
        file8b,
        file9a,
      ]);
    });
    test('sends tree with randomly sized chunks', async () => {
      const fileTreeGen = fileTree.globWalk({
        fs,
        yieldStats: false,
        yieldRoot: false,
        yieldFiles: true,
        yieldParents: true,
        yieldDirectories: true,
      });
      const data: Array<ContentNode | Uint8Array> = [];
      const snipperTransform = vaultsTestUtils.binaryStreamToSnippedStream([
        5, 7, 11, 13,
      ]);
      const parserTransform = fileTree.parserTransformStreamFactory();
      const serializedStream = fileTree.serializerStreamFactory(
        fs,
        fileTreeGen,
      );
      const outputStream = serializedStream
        .pipeThrough(snipperTransform)
        .pipeThrough(parserTransform);
      for await (const output of outputStream) {
        data.push(output);
      }
      const paths = data.map((v) => {
        fileTree.parseTreeNode(v);
        return v.path;
      });
      expect(paths).toIncludeAllMembers([
        dir1,
        dir2,
        dir11,
        dir12,
        dir21,
        dir22,
        file0b,
        file1a,
        file2b,
        file3a,
        file4b,
        file5a,
        file6b,
        file7a,
        file8b,
        file9a,
      ]);
    });
    test('sends multiple trees', async () => {
      function doubleWalkFactory() {
        const stream1 = fileTree.serializerStreamFactory(
          fs,
          fileTree.globWalk({
            fs,
            yieldStats: false,
            yieldRoot: false,
            yieldFiles: true,
            yieldParents: true,
            yieldDirectories: true,
          }),
        );
        const stream2 = fileTree.serializerStreamFactory(
          fs,
          fileTree.globWalk({
            fs,
            yieldStats: false,
            yieldRoot: false,
            yieldFiles: true,
            yieldParents: true,
            yieldDirectories: true,
          }),
        );
        return new ReadableStream({
          start: async (controller) => {
            for await (const data of stream1) controller.enqueue(data);
            for await (const data of stream2) controller.enqueue(data);
            controller.close();
          },
        });
      }
      const data: Array<ContentNode | Uint8Array> = [];
      const parserTransform = fileTree.parserTransformStreamFactory();
      // Const serializedStream = fileTree.serializerStreamFactory(fileTreeGen);
      const serializedStream = doubleWalkFactory();
      const outputStream = serializedStream.pipeThrough(parserTransform);
      for await (const output of outputStream) {
        data.push(output);
      }
      const paths = data.map((v) => {
        fileTree.parseTreeNode(v);
        return v.path;
      });
      expect(paths).toIncludeAllMembers([
        dir1,
        dir2,
        dir11,
        dir12,
        dir21,
        dir22,
        file0b,
        file1a,
        file2b,
        file3a,
        file4b,
        file5a,
        file6b,
        file7a,
        file8b,
        file9a,
      ]);
      const dupes = paths.reduce((previous, value) => {
        previous.set(value, (previous.get(value) ?? 0) + 1);
        return previous;
      }, new Map<string, number>());
      for (const dupe of dupes.values()) {
        expect(dupe).toBe(2);
      }
    });
    test('file contents are sent and are correct', async () => {
      const fileTreeGen = fileTree.globWalk({
        fs,
        yieldStats: false,
        yieldRoot: false,
        yieldFiles: true,
        yieldParents: false,
        yieldDirectories: false,
      });
      const data: Array<ContentNode | Uint8Array> = [];
      const parserTransform = fileTree.parserTransformStreamFactory();
      const serializedStream = fileTree.serializerStreamFactory(
        fs,
        fileTreeGen,
      );
      const outputStream = serializedStream.pipeThrough(parserTransform);
      for await (const output of outputStream) {
        data.push(output);
      }
      const contents = data
        .filter((v) => v instanceof Uint8Array)
        .map((v) => Buffer.from(v as Uint8Array).toString());
      const contentHeaders = data.filter(
        (v) => !(v instanceof Uint8Array) && v.type === 'CONTENT',
      ) as Array<ContentNode>;
      expect(contents).toIncludeAllMembers([
        'content-file0',
        'content-file1',
        'content-file2',
        'content-file3',
        'content-file4',
        'content-file5',
        'content-file6',
        'content-file7',
        'content-file8',
        'content-file9',
      ]);
      for (const contentHeader of contentHeaders) {
        expect(contentHeader.dataSize).toBe(13n);
      }
    });
    test.prop(
      [
        fc
          .uint8Array({ size: 'large' })
          .noShrink()
          .map((v) => Buffer.from(v)),
      ],
      { numRuns: 20 },
    )('handles invalid data', async (data) => {
      let limit = 100;
      const dataStream = new ReadableStream({
        pull: (controller) =>
          limit-- > 0 ? controller.enqueue(data) : controller.close(),
      });
      const parserTransform = fileTree.parserTransformStreamFactory();
      const outputStream = dataStream.pipeThrough(parserTransform);
      try {
        for await (const _ of outputStream); // Consume values
      } catch {
        return;
      }
      throw Error('Should have thrown an error when parsing');
    });
    // TODO: tests for
    //  - empty files
    //  - files larger than content chunks

    // TEST: DEBUGGGG
    test('view serializer', async () => {
      const fileTreeGen = fileTree.globWalk({
        fs,
        yieldStats: false,
        yieldRoot: false,
        yieldFiles: true,
        yieldParents: false,
        yieldDirectories: false,
      });
      const data: Array<string> = [];
      for await (const p of fileTreeGen) data.push(p.path);
      const serializedStream = fileTree.serializerStreamFactory(fs, data);
      const parserTransform = fileTree.parserTransformStreamFactory();
      const outputStream = serializedStream.pipeThrough(parserTransform);
      const output: Array<ContentNode | Uint8Array> = [];
      for await (const d of outputStream) {
        output.push(d);
      }
      console.log(output);
    });
  });
});
