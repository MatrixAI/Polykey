import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  VirtualTarGenerator,
  VirtualTarParser,
  types as vtarTypes,
} from '@matrixai/js-virtualtar';

// Default chunk size for reading files from the filesystem.
const DEFAULT_CHUNK_SIZE = 64 * 1024;

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

  // 3. Create a dedicated async generator to stream the file's content.
  async function* fileContentStreamer(): AsyncGenerator<Buffer, void, void> {
    let fd: fs.promises.FileHandle | undefined;
    try {
      fd = await fs.promises.open(localFilePath, 'r');
      const buffer = Buffer.alloc(chunkSize);
      while (true) {
        const { bytesRead } = await fd.read(buffer, 0, chunkSize, null);
        if (bytesRead === 0) {
          break;
        }
        yield buffer.subarray(0, bytesRead);
      }
    } finally {
      if (fd) {
        await fd.close();
      }
    }
  }

  // 4. Add the file entry to the tar generator.
  vtar.addFile(
    pathInArchive,
    tarFileStats,
    () => fileContentStreamer(),
  );

  // 5. Finalize the tar archive.
  vtar.finalize();

  // 6. Yield all the generated tar chunks.
  yield* vtar.yieldChunks();
}

/**
 * Parses a tar stream and writes the contents (files and directories)
 * to a specified destination on the local filesystem.
 * This is the core function for the "parsing" part of the task.
 * @param tarStream An AsyncIterable that yields Uint8Array chunks of a tar archive.
 * @param destDir The destination directory to extract the contents to.
 */
async function parseTarStreamToFS(
  tarStream: AsyncIterable<Uint8Array>,
  destDir: string,
): Promise<void> {
  console.log(`--- Parsing Tar Stream to Directory: ${destDir} ---`);
  
  const vtarParser = new VirtualTarParser({
    // This callback runs when the parser finds a file header.
    onFile: async (header, dataStream) => {
      console.log(`  -> Found file in archive: '${header.path}'`);
      const fullDestPath = path.join(destDir, header.path);

      // Ensure the directory for the file exists.
      await fs.promises.mkdir(path.dirname(fullDestPath), { recursive: true });

      // Open a file handle for writing.
      let fd: fs.promises.FileHandle | undefined;
      try {
        fd = await fs.promises.open(fullDestPath, 'w');
        // Stream the file's content chunks directly to the file on disk.
        for await (const chunk of dataStream()) {
          await fd.write(chunk);
        }
        console.log(`    -> Wrote file to: '${fullDestPath}'`);
      } finally {
        if (fd) {
          await fd.close();
        }
      }
    },
    // This callback runs when the parser finds a directory header.
    onDirectory: async (header) => {
      console.log(`  -> Found directory in archive: '${header.path}'`);
      const fullDestPath = path.join(destDir, header.path);
      await fs.promises.mkdir(fullDestPath, { recursive: true });
    },
    onEnd: () => {
      console.log('--- Tar Parsing Finished ---\n');
    },
  });

  // Feed the generated tar chunks from the stream into the parser.
  for await (const chunk of tarStream) {
    await vtarParser.write(chunk);
  }
  // Wait for all asynchronous parsing operations (like onFile) to complete.
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
    const originalFileContent = 'This is a test of streaming a file with virtualtar!';
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
    const extractedFileContent = await fs.promises.readFile(extractedFilePath, 'utf-8');
    
    expect(extractedFileContent).toEqual(originalFileContent);
    console.log('✅ Verification successful: Original and parsed content match!');
  });
});
