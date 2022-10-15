import b from 'benny';
import { summaryName, suiteCommon } from '../../utils';

async function main() {
  const buf = Buffer.allocUnsafe(64);
  const summary = await b.suite(
    summaryName(__filename),
    b.add('JSON stringify and parse buffer', () => {
      const bufJSON = JSON.stringify(buf);
      Buffer.from(JSON.parse(bufJSON));
    }),
    b.add('Base64 encode and decode buffer', () => {
      const bufBase64 = buf.toString('base64');
      Buffer.from(bufBase64, 'base64');
    }),
    b.add('Base64url encode and decode buffer', () => {
      const bufBase64 = buf.toString('base64url');
      Buffer.from(bufBase64, 'base64url');
    }),
    ...suiteCommon,
  );
  return summary;
}

if (require.main === module) {
  void main();
}

export default main;
