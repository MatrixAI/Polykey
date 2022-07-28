import fs from 'fs';
import path from 'path';
import b from 'benny';
import { codeBlock } from 'common-tags';
import packageJson from '../../package.json';

const suiteCommon = [
  b.cycle(),
  b.complete(),
  b.save({
    file: (summary) => summary.name,
    folder: path.join(__dirname, '../results'),
    version: packageJson.version,
    details: true,
  }),
  b.save({
    file: (summary) => summary.name,
    folder: path.join(__dirname, '../results'),
    version: packageJson.version,
    format: 'chart.html',
  }),
  b.complete((summary) => {
    const filePath = path.join(
      __dirname,
      '../results',
      summary.name + '_metrics.txt',
    );
    fs.writeFileSync(
      filePath,
      codeBlock`
      # TYPE ${summary.name}_ops gauge
      ${summary.results
        .map(
          (result) =>
            `${summary.name}_ops{name="${result.name}"} ${result.ops}`,
        )
        .join('\n')}

      # TYPE ${summary.name}_margin gauge
      ${summary.results
        .map(
          (result) =>
            `${summary.name}_margin{name="${result.name}"} ${result.margin}`,
        )
        .join('\n')}

      # TYPE ${summary.name}_samples counter
      ${summary.results
        .map(
          (result) =>
            `${summary.name}_samples{name="${result.name}"} ${result.samples}`,
        )
        .join('\n')}
      ` + '\n',
    );
    // eslint-disable-next-line no-console
    console.log('\nSaved to:', path.resolve(filePath));
  }),
];

export { suiteCommon };
