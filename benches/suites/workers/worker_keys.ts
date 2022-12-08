import type { Summary } from 'benny/lib/internal/common-types';
import type { CertificateASN1 } from '@/keys/types';
import b from 'benny';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as workersUtils from '@/workers/utils';
import * as keysUtils from '@/keys/utils';
import { summaryName, suiteCommon } from '../../utils';

async function main() {
  const cores = 1;
  const logger = new Logger(`worker_overhead bench`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const workerManager = await workersUtils.createWorkerManager({
    cores,
    logger,
  });
  let summary: Summary;
  try {
    summary = await b.suite(
      summaryName(__filename),
      b.add('hash password', async () => {
        await workerManager.call(async (w) => {
          const [hash, salt] = await w.hashPassword('password');
          return [Buffer.from(hash), Buffer.from(salt)];
        });
      }),
      b.add('check password', async () => {
        const [hash, salt] = keysUtils.hashPassword('password');
        return async () => {
          await workerManager.call(async (w) => {
            return await w.checkPassword('password', hash.buffer, salt.buffer);
          });
        };
      }),
      b.add('generate deterministic key pair', async () => {
        const recoveryCode = keysUtils.generateRecoveryCode(24);
        return async () => {
          await workerManager.call(async (w) => {
            const result = await w.generateDeterministicKeyPair(recoveryCode);
            result.publicKey = Buffer.from(result.publicKey);
            result.privateKey = Buffer.from(result.privateKey);
            result.secretKey = Buffer.from(result.secretKey);
            return result;
          });
        };
      }),
      b.add('generate certificate', async () => {
        const certIdGenerator = keysUtils.createCertIdGenerator();
        const subjectKeyPair = keysUtils.generateKeyPair();
        return async () => {
          await workerManager.call(async (w) => {
            const result = await w.generateCertificate({
              certId: certIdGenerator(),
              subjectKeyPair: {
                publicKey: subjectKeyPair.publicKey.buffer,
                privateKey: subjectKeyPair.privateKey.buffer,
              },
              issuerPrivateKey: subjectKeyPair.privateKey.buffer,
              duration: 1000,
            });
            return keysUtils.certFromASN1(
              Buffer.from(result) as CertificateASN1,
            )!;
          });
        };
      }),
      ...suiteCommon,
    );
  } finally {
    await workerManager.destroy();
  }
  return summary;
}

if (require.main === module) {
  void main();
}

export default main;
