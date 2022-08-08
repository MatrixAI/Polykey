import type { NodeId } from '@/nodes/types';
import path from 'path';
import fs from 'fs';
import lock from 'fd-lock';
import { IdInternal } from '@matrixai/id';
import * as keysUtils from '@/keys/utils';
import * as grpcErrors from '@/grpc/errors';
import { sleep } from '@/utils';

/**
 * Setup the global keypair
 * This is expected to be executed by multiple worker processes
 */
async function setupGlobalKeypair() {
  const globalKeyPairDir = path.join(globalThis.dataDir, 'keypair');
  const globalKeyPairLock = await fs.promises.open(
    path.join(globalThis.dataDir, 'keypair.lock'),
    fs.constants.O_WRONLY | fs.constants.O_CREAT,
  );
  while (!lock(globalKeyPairLock.fd)) {
    await sleep(1000);
  }
  try {
    try {
      await fs.promises.mkdir(globalKeyPairDir);
    } catch (e) {
      // Return key pair if the directory exists
      if (e.code === 'EEXIST') {
        const globalKeyPairPem = {
          publicKey: fs.readFileSync(
            path.join(globalKeyPairDir, 'root.pub'),
            'utf-8',
          ),
          privateKey: fs.readFileSync(
            path.join(globalKeyPairDir, 'root.key'),
            'utf-8',
          ),
        };
        const globalKeyPair = keysUtils.keyPairFromPem(globalKeyPairPem);
        return globalKeyPair;
      }
    }
    const globalKeyPair = await keysUtils.generateKeyPair(4096);
    const globalKeyPairPem = keysUtils.keyPairToPem(globalKeyPair);
    await Promise.all([
      fs.promises.writeFile(
        path.join(globalKeyPairDir, 'root.pub'),
        globalKeyPairPem.publicKey,
        'utf-8',
      ),
      fs.promises.writeFile(
        path.join(globalKeyPairDir, 'root.key'),
        globalKeyPairPem.privateKey,
        'utf-8',
      ),
    ]);
    return globalKeyPair;
  } finally {
    // Unlock when we have returned the keypair
    lock.unlock(globalKeyPairLock.fd);
    await globalKeyPairLock.close();
  }
}

function generateRandomNodeId(): NodeId {
  const random = keysUtils.getRandomBytesSync(16).toString('hex');
  return IdInternal.fromString<NodeId>(random);
}

const expectRemoteError = async <T>(
  promise: Promise<T>,
  error,
): Promise<T | undefined> => {
  await expect(promise).rejects.toThrow(grpcErrors.ErrorPolykeyRemote);
  try {
    return await promise;
  } catch (e) {
    expect(e.cause).toBeInstanceOf(error);
  }
};

function testIf(condition: boolean) {
  return condition ? test : test.skip;
}

function describeIf(condition: boolean) {
  return condition ? describe : describe.skip;
}

export {
  setupGlobalKeypair,
  generateRandomNodeId,
  expectRemoteError,
  testIf,
  describeIf,
};
