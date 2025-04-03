import type { CertificateASN1 } from '#keys/types.js';
import url from 'node:url';
import path from 'node:path';
import b from 'benny';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { suiteCommon } from './utils/utils.js';
import * as workersUtils from '#workers/utils.js';
import * as keysUtils from '#keys/utils/index.js';

const filename = url.fileURLToPath(new URL(import.meta.url));

async function main() {
  const cores = 1;
  const logger = new Logger(`worker_overhead bench`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const workerManager = await workersUtils.createWorkerManager({
    cores,
    logger,
  });
  let summary: Awaited<ReturnType<typeof b.suite>>;
  try {
    summary = await b.suite(
      path.basename(filename, path.extname(filename)),
      b.add('hash password', async () => {
        await workerManager.methods.hashPassword({ password: 'password' });
      }),
      b.add('check password', async () => {
        const [hash, salt] = keysUtils.hashPassword('password');
        return async () => {
          const hashAB = workersUtils.toArrayBuffer(hash);
          const saltAB = workersUtils.toArrayBuffer(salt);
          await workerManager.methods.checkPassword({
            password: 'password',
            hash: hashAB,
            salt: saltAB,
          });
        };
      }),
      b.add('generate deterministic key pair', async () => {
        const recoveryCode = keysUtils.generateRecoveryCode(24);
        return async () => {
          await workerManager.methods.generateDeterministicKeyPair({
            recoveryCode,
          });
        };
      }),
      b.add('generate certificate', async () => {
        const certIdGenerator = keysUtils.createCertIdGenerator();
        const subjectKeyPair = keysUtils.generateKeyPair();
        return async () => {
          const certIdAB = workersUtils.toArrayBuffer(
            certIdGenerator().toBuffer(),
          );
          const privateKeyAB = workersUtils.toArrayBuffer(
            subjectKeyPair.privateKey,
          );
          const { data: result } =
            await workerManager.methods.generateCertificate(
              {
                certId: certIdAB,
                subjectKeyPair: {
                  publicKey: workersUtils.toArrayBuffer(
                    subjectKeyPair.publicKey,
                  ),
                  privateKey: privateKeyAB,
                },
                issuerPrivateKey: privateKeyAB,
                duration: 1000,
              },
              [certIdAB],
            );
          void keysUtils.certFromASN1(
            workersUtils.fromArrayBuffer(result) as CertificateASN1,
          )!;
        };
      }),
      ...suiteCommon,
    );
  } finally {
    await workerManager.destroy();
  }
  return summary;
}

if (import.meta.url.startsWith('file:')) {
  const modulePath = url.fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    void main();
  }
}

export default main;
