#!/usr/bin/env ts-node

import type { Summary } from 'benny/lib/internal/common-types';
import fs from 'fs';
import path from 'path';
import si from 'systeminformation';
import { fsWalk, resultsPath, suitesPath } from './utils';

async function main(): Promise<void> {
  await fs.promises.mkdir(path.join(__dirname, 'results'), { recursive: true });
  // Running all suites
  for await (const suitePath of fsWalk(suitesPath)) {
    // Skip over non-ts and non-js files
    const ext = path.extname(suitePath);
    if (
      (ext !== '.ts'
      && ext !== '.js')
      || path.basename(suitePath) !== 'vault_operations.ts'
    ) {
      continue;
    }
    const suite: () => Promise<Summary> = (await import(suitePath)).default;
    // Skip default exports that are not functions and are not called "main"
    // They might be utility files
    if (typeof suite === 'function' && suite.name === 'main') {
      await suite();
    }
  }
  // Concatenating metrics
  const metricsPath = path.join(resultsPath, 'metrics.txt');
  await fs.promises.rm(metricsPath, { force: true });
  let concatenating = false;
  for await (const metricPath of fsWalk(resultsPath)) {
    // Skip over non-metrics files
    if (!metricPath.endsWith('_metrics.txt')) {
      continue;
    }
    const metricData = await fs.promises.readFile(metricPath);
    if (concatenating) {
      await fs.promises.appendFile(metricsPath, '\n');
    }
    await fs.promises.appendFile(metricsPath, metricData);
    concatenating = true;
  }
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
