import type {
  PolykeyWorkerManager,
  PolykeyWorkerManifest,
} from '../workers/index.js';
import type Logger from '@matrixai/logger';
import path from 'node:path';
import url from 'node:url';
import { Worker } from 'node:worker_threads';
import { WorkerManager } from '@matrixai/workers';
import * as workerErrors from './errors.js';
import { polykeyWorkerManifest } from '../workers/index.js';

const dirname = url.fileURLToPath(new URL('.', import.meta.url));
const workerPath = path.join(dirname, './polykeyWorkerManifest.js');

async function createWorkerManager({
  cores,
  logger,
}: {
  cores?: number;
  logger?: Logger;
}): Promise<PolykeyWorkerManager> {
  if (cores != null && (cores < 0 || isNaN(cores))) {
    throw new workerErrors.ErrorWorkersInvalidCores();
  }
  return await WorkerManager.createWorkerManager<PolykeyWorkerManifest>({
    workerFactory: () => new Worker(workerPath),
    manifest: polykeyWorkerManifest,
    cores,
    logger,
  });
}

/**
 * Slice-copies the Node Buffer to a new ArrayBuffer
 */
function toArrayBuffer(b: Buffer): ArrayBuffer {
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

/**
 * Wraps ArrayBuffer in Node Buffer with zero copy
 */
function fromArrayBuffer(
  b: ArrayBuffer,
  offset?: number,
  length?: number,
): Buffer {
  return Buffer.from(b, offset, length);
}

export { createWorkerManager, toArrayBuffer, fromArrayBuffer };
