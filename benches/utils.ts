import fs from 'fs';
import path from 'path';
import b from 'benny';
import { codeBlock } from 'common-tags';
import packageJson from '../package.json';

const suitesPath = path.join(__dirname, 'suites');
const resultsPath = path.join(__dirname, 'results');

function summaryName(suitePath: string) {
  return path
    .relative(suitesPath, suitePath)
    .replace(/\.[^.]*$/, '')
    .replace(/\//g, '.');
}

const suiteCommon = [
  b.cycle(),
  b.complete(),
  b.save({
    file: (summary) => {
      // Replace dots with slashes
      const relativePath = summary.name.replace(/\./g, '/');
      // To `results/path/to/suite`
      const resultPath = path.join(resultsPath, relativePath);
      // This creates directory `results/path/to`
      fs.mkdirSync(path.dirname(resultPath), { recursive: true });
      return relativePath;
    },
    folder: resultsPath,
    version: packageJson.version,
    details: true,
  }),
  b.save({
    file: (summary) => {
      // Replace dots with slashes
      const relativePath = summary.name.replace(/\./g, '/');
      // To `results/path/to/suite`
      const resultPath = path.join(resultsPath, relativePath);
      // This creates directory `results/path/to`
      fs.mkdirSync(path.dirname(resultPath), { recursive: true });
      return relativePath;
    },
    folder: resultsPath,
    version: packageJson.version,
    format: 'chart.html',
  }),
  b.complete((summary) => {
    // Replace dots with slashes
    const relativePath = summary.name.replace(/\./g, '/');
    // To `results/path/to/suite_metrics.txt`
    const resultPath = path.join(resultsPath, relativePath) + '_metrics.txt';
    // This creates directory `results/path/to`
    fs.mkdirSync(path.dirname(resultPath), { recursive: true });
    fs.writeFileSync(
      resultPath,
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
    console.log('\nSaved to:', path.resolve(resultPath));
  }),
];

async function* fsWalk(dir: string): AsyncGenerator<string> {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* fsWalk(res);
    } else {
      yield res;
    }
  }
}

export { suitesPath, resultsPath, summaryName, suiteCommon, fsWalk };
