import type { types as vtarTypes } from '@matrixai/js-virtualtar';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { VirtualTarGenerator, VirtualTarParser } from '@matrixai/js-virtualtar';

const DEFAULT_CHUNK_SIZE = 64 * 1024;

/**
 * An abstracted, reusable async generator to stream a file's content
 * from the local filesystem in manageable chunks.
 * @param localFilePath The path to the file on the local filesystem.
 * @param chunkSize The size of each chunk to read into memory.
 * @returns An AsyncGenerator yielding Buffer chunks of the file's content.
 */
async function* fileContentStreamer(
  localFilePath: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): AsyncGenerator<Buffer, void, void> {
  const fd = await fs.promises.open(localFilePath, 'r');
  try {
    const buffer = Buffer.alloc(chunkSize);
    while (true) {
      const { bytesRead } = await fd.read(buffer, 0, chunkSize, null);
      if (bytesRead === 0) {
        break;
      }
      yield buffer.subarray(0, bytesRead);
    }
  } finally {
    await fd.close();
    console.log(`  -> Closed read handle for: ${path.basename(localFilePath)}`);
  }
}

/**
 * Creates an AsyncGenerator that yields Uint8Array chunks of a tar archive
 * containing a single specified file, streamed directly from the file system.
 * This is the core function for the "generation" part of the task.
 * @param localFilePath The path to the file on the local filesystem.
 * @param pathInArchive The desired path (including name) of the file within the tar archive.
 * @param chunkSize Optional chunk size for reading the file.
 * @returns An AsyncGenerator yielding Uint8Array tar chunks.
 */
async function* streamFileAsTar(
  localFilePath: string,
  pathInArchive: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): AsyncGenerator<Uint8Array, void, void> {
  const vtar = new VirtualTarGenerator();

  // 1. Get file statistics for the tar header.
  let fileStats: fs.Stats;
  try {
    fileStats = await fs.promises.stat(localFilePath);
    if (!fileStats.isFile()) {
      throw new Error(`Path is not a file: ${localFilePath}`);
    }
  } catch (err) {
    console.error(`Error getting stats for ${localFilePath}:`, err);
    throw err;
  }

  // 2. Prepare the stats object for virtualtar.
  const tarFileStats: vtarTypes.FileStat = {
    size: fileStats.size,
    mode: fileStats.mode,
    mtime: fileStats.mtime,
    uid: fileStats.uid,
    gid: fileStats.gid,
  };

  // 4. Add the file entry to the tar generator.
  vtar.addFile(pathInArchive, tarFileStats, () =>
    fileContentStreamer(localFilePath, chunkSize),
  );

  // 5. Finalize the tar archive.
  vtar.finalize();

  // 6. Yield all the generated tar chunks.
  yield* vtar.yieldChunks();
}

/**
 * Creates an AsyncGenerator that yields Uint8Array chunks of a tar archive
 * containing the contents of a specified directory, streamed from the file system.
 */
async function* streamDirectoryAsTar(
  localDirPath: string,
  basePathInArchive: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): AsyncGenerator<Uint8Array, void, void> {
  const vtar = new VirtualTarGenerator();

  // This recursive function will "walk" the directory tree and add operations
  // to the VirtualTarGenerator instance.
  async function walkAndTar(currentFsPath: string, currentArchivePath: string) {
    const entries = await fs.promises.readdir(currentFsPath, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const fullFsPath = path.join(currentFsPath, entry.name);
        const fullArchivePath = path.join(currentArchivePath, entry.name);

        if (entry.isDirectory()) {
          const dirStats = await fs.promises.stat(fullFsPath);
          const tarDirStats: vtarTypes.FileStat = {
            mode: dirStats.mode, mtime: dirStats.mtime, uid: dirStats.uid, gid: dirStats.gid,
          };
          vtar.addDirectory(fullArchivePath, tarDirStats);
          // Recurse into the subdirectory
          await walkAndTar(fullFsPath, fullArchivePath);
        } else if (entry.isFile()) {
          const fileStats = await fs.promises.stat(fullFsPath);
          const tarFileStats: vtarTypes.FileStat = {
            size: fileStats.size, mode: fileStats.mode, mtime: fileStats.mtime, uid: fileStats.uid, gid: fileStats.gid,
          };
          
          vtar.addFile(
              fullArchivePath, 
              tarFileStats, 
              () => fileContentStreamer(fullFsPath, chunkSize)
          );
        }
      })
    );
  }

  const walkPromise = (async () => {
    try {
      await walkAndTar(localDirPath, basePathInArchive);
    } catch(err) {
      // If the walk fails, we'll re-throw the error at the end.
      // The `finally` block ensures the consumer doesn't hang.
      throw err;
    } finally {

      vtar.finalize();
    }
  })();

  yield* vtar.yieldChunks();
  
  await walkPromise;
}

/**
 * Parses a tar stream and writes the contents (files and directories)
 * to a specified destination on the local filesystem.
 */
async function parseTarStreamToFS(
  tarStream: AsyncIterable<Uint8Array>,
  destDir: string,
): Promise<void> {
  console.log(`--- Parsing Tar Stream to Directory: ${destDir} ---`);
  
  const vtarParser = new VirtualTarParser({
    onFile: async (header, dataStream) => {
      console.log(`  -> Found file in archive: '${header.path}'`);
      const fullDestPath = path.join(destDir, header.path);
      await fs.promises.mkdir(path.dirname(fullDestPath), { recursive: true });

      let fd: fs.promises.FileHandle | undefined;
      try {
        fd = await fs.promises.open(fullDestPath, 'w');
        for await (const chunk of dataStream()) {
          await fd.write(chunk);
        }
        console.log(`    -> Wrote file to: '${fullDestPath}'`);
      } finally {
        if (fd) await fd.close();
      }
    },
    onDirectory: async (header) => {
      console.log(`  -> Found directory in archive: '${header.path}'`);
      const fullDestPath = path.join(destDir, header.path);
      await fs.promises.mkdir(fullDestPath, { recursive: true });
    },
    onEnd: () => {
      console.log('--- Tar Parsing Finished ---\n');
    },
  });

  for await (const chunk of tarStream) {
    await vtarParser.write(chunk);
  }
  await vtarParser.settled();
}

/**
 * This is a 'scratch paper' test file for quickly running tests in the CI.
 */
describe('scratch', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-tar-test-'),
    );
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  test('should stream a file as a tar, then parse it back and verify content', async () => {
    // SETUP
    const originalFileName = 'source-file.txt';
    const originalFileContent =
      'This is a test of streaming a file with virtualtar!';
    const localFilePath = path.join(tempDir, originalFileName);
    const pathInArchive = 'test/file-in-tar.txt';
    await fs.promises.writeFile(localFilePath, originalFileContent);
    console.log(`--- Original File Content ---\n'${originalFileContent}'\n`);

    // GENERATION (stream to tar)
    const tarStreamGenerator = streamFileAsTar(localFilePath, pathInArchive);

    // PARSING (tar to file)
    const extractionDir = path.join(tempDir, 'extracted');
    await fs.promises.mkdir(extractionDir);
    await parseTarStreamToFS(tarStreamGenerator, extractionDir);

    const extractedFilePath = path.join(extractionDir, pathInArchive);
    const extractedFileContent = await fs.promises.readFile(
      extractedFilePath,
      'utf-8',
    );

    expect(extractedFileContent).toEqual(originalFileContent);
    console.log(
      '✅ Verification successful: Original and parsed content match!',
    );
  });

  test('should stream a directory as a tar, then parse it back and verify content', async () => {
    const sourceDirName = 'source-dir';
    const localDirPath = path.join(tempDir, sourceDirName);
    const subDirName = 'sub';
    const localSubDirPath = path.join(localDirPath, subDirName);
    const file1Name = 'file1.txt';
    const file2Name = 'file2.log';
    const file1Content = 'Content of file 1';
    const file2Content = 'Content of file 2 in subdirectory';

    await fs.promises.mkdir(localSubDirPath, { recursive: true });
    await fs.promises.writeFile(
      path.join(localDirPath, file1Name),
      file1Content,
    );
    await fs.promises.writeFile(
      path.join(localSubDirPath, file2Name),
      file2Content,
    );
    console.log(
      `--- Created source directory structure in: ${localDirPath} ---\n`,
    );

    const archiveBasePath = 'my-archive';

    const tarStreamGenerator = streamDirectoryAsTar(
      localDirPath,
      archiveBasePath,
    );

    const extractionDir = path.join(tempDir, 'extracted-dir');
    await fs.promises.mkdir(extractionDir);
    await parseTarStreamToFS(tarStreamGenerator, extractionDir);

    const extractedFile1Path = path.join(
      extractionDir,
      archiveBasePath,
      file1Name,
    );
    const extractedFile1Content = await fs.promises.readFile(
      extractedFile1Path,
      'utf-8',
    );
    expect(extractedFile1Content).toEqual(file1Content);
    console.log(`✅ Verified content of: ${extractedFile1Path}`);

    const extractedFile2Path = path.join(
      extractionDir,
      archiveBasePath,
      subDirName,
      file2Name,
    );
    const extractedFile2Content = await fs.promises.readFile(
      extractedFile2Path,
      'utf-8',
    );
    expect(extractedFile2Content).toEqual(file2Content);
    console.log(`✅ Verified content of: ${extractedFile2Path}`);

    const subDirStat = await fs.promises.stat(
      path.join(extractionDir, archiveBasePath, subDirName),
    );
    expect(subDirStat.isDirectory()).toBe(true);
    console.log(
      '✅ Verification successful: Directory structure and all file contents match!',
    );
  });
});
