import b from 'benny';
import * as generate from '@/keys/utils/generate';
import * as recoveryCode from '@/keys/utils/recoveryCode';
import { summaryName, suiteCommon } from '../../utils';

async function main() {
  const code = recoveryCode.generateRecoveryCode(24);
  const summary = await b.suite(
    summaryName(__filename),
    b.add('generate root asymmetric keypair', async () => {
      await generate.generateKeyPair();
    }),
    b.add('generate deterministic root keypair', async () => {
      await generate.generateDeterministicKeyPair(code);
    }),
    b.add('generate 256 bit symmetric key', async () => {
      await generate.generateKey(256);
    }),
    ...suiteCommon,
  );
  return summary;
}

if (require.main === module) {
  void main();
}

export default main;
