import b from 'benny';
import * as password from '@/keys/utils/password';
import { summaryName, suiteCommon } from '../../utils';

async function main() {
  const summary = await b.suite(
    summaryName(__filename),
    b.add('password hashing - min', () => {
      password.hashPassword(
        'password',
        undefined,
        password.passwordOpsLimits.min,
        password.passwordMemLimits.min,
      );
    }),
    b.add('password hashing - interactive', () => {
      password.hashPassword(
        'password',
        undefined,
        password.passwordOpsLimits.interactive,
        password.passwordMemLimits.interactive,
      );
    }),
    b.add('password hashing - moderate', () => {
      password.hashPassword(
        'password',
        undefined,
        password.passwordOpsLimits.moderate,
        password.passwordMemLimits.moderate,
      );
    }),
    b.add('password hashing - sensitive', () => {
      password.hashPassword(
        'password',
        undefined,
        password.passwordOpsLimits.sensitive,
        password.passwordMemLimits.sensitive,
      );
    }),
    ...suiteCommon,
  );
  return summary;
}

if (require.main === module) {
  void main();
}

export default main;
