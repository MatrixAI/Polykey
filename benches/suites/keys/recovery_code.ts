import b from 'benny';
import * as recoveryCode from '@/keys/utils/recoveryCode';
import { summaryName, suiteCommon } from '../../utils';

async function main() {
  const summary = await b.suite(
    summaryName(__filename),
    b.add('generate 24 word recovery code', async () => {
      recoveryCode.generateRecoveryCode(24);
    }),
    b.add('generate 12 word recovery code', async () => {
      recoveryCode.generateRecoveryCode(12);
    }),
    ...suiteCommon,
  );
  return summary;
}

if (require.main === module) {
  void main();
}

export default main;
