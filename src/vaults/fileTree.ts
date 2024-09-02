import type { Stat } from 'encryptedfs';
import type { FileSystem } from '../types';
import type {
  ContentNode,
  DoneMessage,
  FileSystemReadable,
  INode,
  StatEncoded,
  TreeNode,
  Parsed,
  HeaderGeneric,
  HeaderContent,
} from './types';
import path from 'path';
import { ReadableStream, TransformStream } from 'stream/web';
import { minimatch } from 'minimatch';
import * as vaultsUtils from './utils';
import { HeaderSize, HeaderType, HeaderMagic } from './types';
import * as utils from '../utils';
import * as validationErrors from '../validation/errors';

/**
 * Generates a serializable format of file stats
 */
function generateStats(stat: Stat): StatEncoded {
  return {
    isSymbolicLink: stat.isSymbolicLink(),
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode,
    nlink: stat.nlink,
    uid: stat.uid,
    gid: stat.gid,
    rdev: stat.rdev,
    size: stat.size,
    blksize: stat.blksize,
    blocks: stat.blocks,
    atime: stat.atime.getTime(),
    mtime: stat.mtime.getTime(),
    ctime: stat.ctime.getTime(),
    birthtime: stat.birthtime.getTime(),
  };
}

/**
 * This is a utility for walking a file tree while matching a file path globstar pattern.
 * @param fs - file system to work against, supports nodes `fs` and our `FileSystemReadable` provided by vaults.
 * @param basePath - The path to start walking from.
 * @param pattern - The pattern to match against, defaults to everything
 * @param yieldRoot - toggles yielding details of the basePath. Defaults to true.
 * @param yieldParents - Toggles yielding details about parents of pattern matched paths. Defaults to false.
 * @param yieldDirectories - Toggles yielding directories that match the pattern. Defaults to true.
 * @param yieldFiles - Toggles yielding files that match the pattern. Defaults to true.
 * @param yieldStats - Toggles including stats in file and directory details. Defaults to false.
 */
async function* globWalk({
  fs,
  basePath = '.',
  pattern = '**/*',
  yieldRoot = true,
  yieldParents = false,
  yieldDirectories = true,
  yieldFiles = true,
  yieldStats = false,
}: {
  fs: FileSystem | FileSystemReadable;
  basePath?: string;
  pattern?: string;
  yieldRoot?: boolean;
  yieldParents?: boolean;
  yieldDirectories?: boolean;
  yieldFiles?: boolean;
  yieldStats?: boolean;
}): AsyncGenerator<TreeNode, void, void> {
  const directoryMap: Map<number, TreeNode> = new Map();
  // Array<[Path, node, parent]>
  const queue: Array<[string, INode, INode]> = [];
  let iNode = 1;
  const basePathNormalised = path.normalize(basePath);
  let current: [string, INode, INode] | undefined = [basePathNormalised, 1, 0];

  // Generates a list of parent nodes in order of parent to child
  function* getParents(parentINode: INode): Generator<TreeNode, void, void> {
    const parents: Array<TreeNode> = [];
    let currentParent = parentINode;
    while (true) {
      const directory = directoryMap.get(currentParent);
      directoryMap.delete(currentParent);
      if (directory == null) break;
      parents.unshift(directory);
      currentParent = directory.parent;
    }
    for (const parent of parents) {
      yield parent;
    }
  }

  // Wrapper function to handle compatability between fs and efs.
  // Exists as a placeholder for better handling if needed.
  async function readDir(path: string): Promise<Array<string>> {
    // @ts-ignore: While the types don't fully match, it matches enough for our usage.
    return await fs.promises.readdir(path);
  }

  // Iterate over tree
  const patternPath = path.join(basePathNormalised, pattern);
  while (current != null) {
    const [currentPath, node, parentINode] = current;
    const stat = await fs.promises.stat(currentPath);
    if (stat.isDirectory()) {
      // `.` and `./` will not partially match the pattern, so we exclude the initial path
      // We're doing a partial match to skip directories that can't contain our pattern
      if (
        !minimatch(currentPath, patternPath, { partial: true }) &&
        currentPath !== basePathNormalised
      ) {
        current = queue.shift();
        continue;
      }
      const childrenPaths: Array<string> = await readDir(currentPath);
      // Filling in iNode details for adding to queue
      const children = childrenPaths.map(
        (v) =>
          [path.join(currentPath!, v.toString()), ++iNode, node] as [
            string,
            INode,
            INode,
          ],
      );
      queue.push(...children);
      // Only yield root if enabled
      if (yieldRoot || node !== 1) {
        directoryMap.set(node, {
          type: 'DIRECTORY',
          path: currentPath,
          iNode: node,
          parent: parentINode,
          stat: yieldStats ? generateStats(stat) : undefined,
        });
      }
      // Wildcards can find directories so we need yield them too
      if (!minimatch(currentPath, patternPath)) {
        current = queue.shift();
        continue;
      }
      // Yield directory if enabled
      if (yieldDirectories) {
        // Yield parents only if enabled and the child is yielded
        if (yieldParents) {
          yield* getParents(parentINode);
        }
        // Remove current from parent map since we yielded it already
        directoryMap.delete(node);
        yield {
          type: 'DIRECTORY',
          path: currentPath,
          iNode: node,
          parent: parentINode,
          stat: yieldStats ? generateStats(stat) : undefined,
        };
      }
    } else if (stat.isFile()) {
      // Check if the file matches the pattern
      if (!minimatch(currentPath, patternPath)) {
        current = queue.shift();
        continue;
      }
      // If enabled, yield the directories in order of parent to child
      if (yieldParents) {
        yield* getParents(parentINode);
      }
      // Yield file if it is enabled
      if (yieldFiles) {
        yield {
          type: 'FILE',
          path: currentPath,
          iNode: node,
          parent: parentINode,
          stat: yieldStats ? generateStats(stat) : undefined,
        };
      }
    }
    current = queue.shift();
  }
}

/**
 * Creates the base header with extra bytes to fill in extra header data for sub headers.
 * Formatted as...
 * 'H'(1) |  HEADER_TYPE(1)
 */
function generateGenericHeader(headerData: HeaderGeneric): Uint8Array {
  const header = new Uint8Array(HeaderSize.GENERIC);
  const dataView = new DataView(
    header.buffer,
    header.byteOffset,
    header.byteLength,
  );
  dataView.setInt8(0, HeaderMagic.START);
  dataView.setInt8(1, headerData.type);
  return header;
}

/**
 * Creates the content header which identifies the content with the length.
 * Data should follow this header.
 * Formatted as...
 * generic_header(10) | total_size(8)[data_size + header_size] | i_node(4) | 'D'(1)
 */
function generateContentHeader(headerData: HeaderContent): Uint8Array {
  const contentHeader = new Uint8Array(HeaderSize.CONTENT);
  const dataView = new DataView(
    contentHeader.buffer,
    contentHeader.byteOffset,
    contentHeader.byteLength,
  );
  dataView.setBigUint64(0, headerData.dataSize, false);
  dataView.setUint32(8, headerData.iNode, false);
  dataView.setUint8(12, HeaderMagic.END);
  return contentHeader;
}

// Parsers

function parseGenericHeader(data: Uint8Array): Parsed<HeaderGeneric> {
  const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (data.byteLength < HeaderSize.GENERIC) return { remainder: data };
  const magicByte = dataView.getUint8(0);
  if (magicByte !== HeaderMagic.START) {
    throw new validationErrors.ErrorParse(
      `invalid magic byte, should be "${HeaderMagic.START}", found "${magicByte}"`,
    );
  }
  const headerType = dataView.getUint8(1);
  if (!(headerType in HeaderType)) {
    throw new validationErrors.ErrorParse(
      `header type was not valid type in 'HeaderType', found "${headerType}")`,
    );
  }
  return {
    data: {
      type: headerType,
    },
    remainder: data.subarray(HeaderSize.GENERIC),
  };
}

function parseContentHeader(data: Uint8Array): Parsed<HeaderContent> {
  const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (data.byteLength < HeaderSize.CONTENT) return { remainder: data };
  const dataSize = dataView.getBigUint64(0, false);
  const iNode = dataView.getUint32(8, false);
  const magicByte = dataView.getUint8(12);
  if (magicByte !== HeaderMagic.END) {
    throw new validationErrors.ErrorParse(
      `invalid magic byte, should be "${HeaderMagic.END}", found "${magicByte}"`,
    );
  }
  return {
    data: {
      dataSize,
      iNode,
    },
    remainder: data.subarray(HeaderSize.CONTENT),
  };
}

/**
 * Takes a filesystem and filePath and generates a content header with the contents of the file in chunks.
 * The chunk size is specified by the `chunkSize` parameter.
 * @param fs - File system used to access files.
 * @param path - filePath for the file to serialize.
 * @param iNode - file identifier number to be included in the header.
 * @param chunkSize - Maximum chunk sized used when sending file data, defaults to 4kB
 */
async function* encodeContent(
  fs: FileSystem | FileSystemReadable,
  path: string,
  iNode: number,
  chunkSize: number = 1024 * 4,
): AsyncGenerator<Uint8Array, void, void> {
  const fd = await fs.promises.open(path, 'r');
  async function read(buffer: Uint8Array): Promise<{
    bytesRead: number;
    buffer: Uint8Array;
  }> {
    if (typeof fd === 'number') {
      // Handle as an EFS fd
      const fsr = fs as FileSystemReadable;
      const bytesRead = await fsr.promises.read(
        fd,
        buffer,
        undefined,
        buffer.byteLength,
      );
      return { bytesRead, buffer };
    } else {
      // Handle as an FS fd
      return fd.read({ buffer });
    }
  }
  async function close(): Promise<void> {
    if (typeof fd === 'number') {
      // Handle as an EFS fd
      const fsr = fs as FileSystemReadable;
      return await fsr.close(fd);
    } else {
      // Handle as an FS fd
      return await fd.close();
    }
  }
  try {
    const stats = await fs.promises.stat(path);
    yield vaultsUtils.uint8ArrayConcat([
      generateGenericHeader({
        type: HeaderType.CONTENT,
      }),
      generateContentHeader({
        dataSize: BigInt(stats.size),
        iNode,
      }),
    ]);
    while (true) {
      const readResult = await read(new Uint8Array(chunkSize));
      if (readResult.bytesRead === 0) break;
      yield readResult.buffer.subarray(0, readResult.bytesRead);
      if (readResult.bytesRead < chunkSize) break;
    }
  } finally {
    await close();
  }
}

/**
 * Takes an AsyncGenerator<TreeNode> and serializes it into a `ReadableStream<UInt8Array>`
 * @param fs
 * @param treeGen - An AsyncGenerator<TreeNode> that yields the files and directories of a file tree.
 */
function serializerStreamFactory(
  fs: FileSystem | FileSystemReadable,
  treeGen: AsyncGenerator<TreeNode, void, void>,
): ReadableStream<Uint8Array> {
  let contentsGen: AsyncGenerator<Uint8Array, void, void> | undefined;
  let fileNode: TreeNode | undefined;
  async function getNextContentChunk(): Promise<Uint8Array | undefined> {
    while (true) {
      if (contentsGen == null) {
        // Keep consuming values if the result is not a file
        while (true) {
          const result = await treeGen.next();
          if (result.done) return undefined;
          if (result.value.type === 'FILE') {
            fileNode = result.value;
            break;
          }
        }
        contentsGen = encodeContent(fs, fileNode.path, fileNode.iNode);
      }
      const contentChunk = await contentsGen.next();
      if (!contentChunk.done) return contentChunk.value;
      contentsGen = undefined;
    }
  }
  async function cleanup(reason: unknown) {
    await treeGen?.throw(reason).catch(() => {});
    await contentsGen?.throw(reason).catch(() => {});
  }
  return new ReadableStream<Uint8Array>({
    pull: async (controller) => {
      try {
        const contentChunk = await getNextContentChunk();
        if (contentChunk == null) return controller.close();
        else controller.enqueue(contentChunk);
      } catch (e) {
        await cleanup(e);
        return controller.error(e);
      }
    },
    cancel: async (reason) => {
      await cleanup(reason);
    },
  });
}

/**
 * Type-guard for checking if an object is structured as a `DoneMessage`.
 */
function isDoneMessage(data: unknown): data is DoneMessage {
  if (!utils.isObject(data)) return false;
  if (Array.isArray(data)) return false;
  return 'type' in data && data.type === 'DONE';
}

/**
 * Type-guard assertion for checking if an object is structured as a `TreeNode`.
 */
function parseTreeNode(data: unknown): asserts data is TreeNode {
  if (!utils.isObject(data)) {
    throw new validationErrors.ErrorParse('Must be an object');
  }
  if (Array.isArray(data)) {
    throw new validationErrors.ErrorParse("Can't be an array");
  }
  if (!('type' in data)) {
    throw new validationErrors.ErrorParse("'type' parameter must be defined");
  }
  const type = data.type;
  if (typeof type !== 'string') {
    throw new validationErrors.ErrorParse("'type' parameter must be a string");
  }
  if (!(type === 'FILE' || type === 'DIRECTORY')) {
    throw new validationErrors.ErrorParse(
      "'type' parameter must be either 'FILE' or 'DIRECTORY'",
    );
  }
  if (!('path' in data && typeof data.path == 'string')) {
    throw new validationErrors.ErrorParse(
      "'path' parameter must be defined and a string",
    );
  }
  if (!('iNode' in data && typeof data.iNode == 'number')) {
    throw new validationErrors.ErrorParse(
      "'iNode' parameter must be defined and a number",
    );
  }
  if (!('parent' in data && typeof data.parent == 'number')) {
    throw new validationErrors.ErrorParse(
      "'parent' parameter must be defined and a number",
    );
  }
}

/**
 * Creates a TransformStream webStream to transform a binary `UInt8Array` stream into a parsed file tree stream.
 * Will yield `TreeNode`s defining the file tree.
 * If file contents are included in the stream it will yield `ContentNode`s defining the file metadata and raw binary
 * `UInit8Array` chunks of the contents.
 */
function parserTransformStreamFactory(): TransformStream<
  Uint8Array,
  ContentNode | Uint8Array
> {
  let workingBuffer: Uint8Array = new Uint8Array(0);
  let contentLength: bigint | undefined = undefined;
  let processedChunks: boolean = false;

  return new TransformStream<Uint8Array, ContentNode | Uint8Array>({
    /**
     * Check if any chunks have been processed. If the stream is being flushed
     * without processing any chunks, then something went wrong with the stream.
     */
    flush: (controller) => {
      if (!processedChunks) {
        controller.error(
          new validationErrors.ErrorParse('Stream ended prematurely'),
        );
      }
    },
    transform: (chunk, controller) => {
      if (chunk.byteLength > 0) processedChunks = true;
      workingBuffer = vaultsUtils.uint8ArrayConcat([workingBuffer, chunk]);
      if (contentLength == null) {
        const genericHeader = parseGenericHeader(workingBuffer);
        if (genericHeader.data == null) return;
        if (genericHeader.data.type !== HeaderType.CONTENT) {
          controller.error(
            new validationErrors.ErrorParse(
              `expected CONTENT message, got "${genericHeader.data.type}"`,
            ),
          );
          return;
        }
        const contentHeader = parseContentHeader(genericHeader.remainder);
        if (contentHeader.data == null) return;

        const { dataSize, iNode } = contentHeader.data;
        controller.enqueue({ type: 'CONTENT', dataSize, iNode });
        contentLength = dataSize;
        workingBuffer = contentHeader.remainder;
      }
      // We yield the whole buffer, or split it for the next header
      if (workingBuffer.byteLength === 0) return;
      if (workingBuffer.byteLength <= contentLength) {
        contentLength -= BigInt(workingBuffer.byteLength);
        controller.enqueue(workingBuffer);
        workingBuffer = new Uint8Array(0);
        if (contentLength === 0n) contentLength = undefined;
      } else {
        controller.enqueue(workingBuffer.subarray(0, Number(contentLength)));
        workingBuffer = workingBuffer.subarray(Number(contentLength));
        contentLength = undefined;
      }
    },
  });
}

export {
  HeaderSize,
  HeaderType,
  HeaderMagic,
  generateStats,
  globWalk,
  generateGenericHeader,
  generateContentHeader,
  parseGenericHeader,
  parseContentHeader,
  encodeContent,
  serializerStreamFactory,
  isDoneMessage,
  parseTreeNode,
  parserTransformStreamFactory,
};
