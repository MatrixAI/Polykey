import b from 'benny';
import * as random from '@/keys/utils/random';
import { summaryName, suiteCommon } from '../../utils';

async function main() {
  const summary = await b.suite(
    summaryName(__filename),
    b.add('random 512 B of data', () => {
      random.getRandomBytesSync(512);
    }),
    b.add('random 1 KiB of data', () => {
      random.getRandomBytesSync(1024);
    }),
    b.add('random 10 KiB of data', () => {
      random.getRandomBytesSync(1024 * 10);
    }),
    ...suiteCommon,
  );
  return summary;
}

if (require.main === module) {
  void main();
}

export default main;
