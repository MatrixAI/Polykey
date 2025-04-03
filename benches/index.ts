#!/usr/bin/env ts-node

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import si from 'systeminformation';
import { benchesPath } from './utils/utils.js';
import basicBufferEncodingDecoding from './basic_buffer_encoding_decoding.js';
import gitGarbageCollection from './git_garbage_collection.js';
import keysAsymmetricCrypto from './keys_asymmetric_crypto.js';
import keysKeyGeneration from './keys_key_generation.js';
import keysKeyringLifecycle from './keys_keyring_lifecycle.js';
import keysPasswordHashing from './keys_password_hashing.js';
import keysRandomBytes from './keys_random_bytes.js';
import keysRecoveryCode from './keys_recovery_code.js';
import keysSymmetricCrypto from './keys_symmetric_crypto.js';
import keysX509 from './keys_x509.js';
import workersKeys from './workers_keys.js';
import workersOverhead from './workers_overhead.js';

async function main(): Promise<void> {
  await fs.promises.mkdir(path.join(benchesPath, 'results'), {
    recursive: true,
  });
  await basicBufferEncodingDecoding();
  await gitGarbageCollection();
  await keysAsymmetricCrypto();
  await keysKeyGeneration();
  await keysKeyringLifecycle();
  await keysPasswordHashing();
  await keysRandomBytes();
  await keysRecoveryCode();
  await keysSymmetricCrypto();
  await keysX509();
  await workersKeys();
  await workersOverhead();
  const resultFilenames = await fs.promises.readdir(
    path.join(benchesPath, 'results'),
  );
  const metricsFile = await fs.promises.open(
    path.join(benchesPath, 'results', 'metrics.txt'),
    'w',
  );
  let concatenating = false;
  for (const resultFilename of resultFilenames) {
    if (/.+_metrics\.txt$/.test(resultFilename)) {
      const metricsData = await fs.promises.readFile(
        path.join(benchesPath, 'results', resultFilename),
      );
      if (concatenating) {
        await metricsFile.write('\n');
      }
      await metricsFile.write(metricsData);
      concatenating = true;
    }
  }
  await metricsFile.close();
  const systemData = await si.get({
    cpu: '*',
    osInfo: 'platform, distro, release, kernel, arch',
    system: 'model, manufacturer',
  });
  await fs.promises.writeFile(
    path.join(benchesPath, 'results', 'system.json'),
    JSON.stringify(systemData, null, 2),
  );
}

if (import.meta.url.startsWith('file:')) {
  const modulePath = url.fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    void main();
  }
}

export default main;
