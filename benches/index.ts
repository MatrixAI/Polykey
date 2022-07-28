#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import si from 'systeminformation';
import gitgc from './gitgc';

async function main(): Promise<void> {
  await fs.promises.mkdir(path.join(__dirname, 'results'), { recursive: true });
  await gitgc();
  const resultFilenames = await fs.promises.readdir(
    path.join(__dirname, 'results'),
  );
  const metricsFile = await fs.promises.open(
    path.join(__dirname, 'results', 'metrics.txt'),
    'w',
  );
  let concatenating = false;
  for (const resultFilename of resultFilenames) {
    if (/.+_metrics\.txt$/.test(resultFilename)) {
      const metricsData = await fs.promises.readFile(
        path.join(__dirname, 'results', resultFilename),
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
    path.join(__dirname, 'results', 'system.json'),
    JSON.stringify(systemData, null, 2),
  );
}

if (require.main === module) {
  void main();
}

export default main;
