import os from 'os';
import path from 'path';
import fs from 'fs';
import { pk } from './utils';
import { PolykeyAgent } from '../../src';
import main from '@/bin/polykey';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

const logger = new Logger('CLI Test', LogLevel.WARN, [new StreamHandler()]);
let dataDir: string;
let polykeyAgent: PolykeyAgent;

describe('polykey', () => {
  test('default help display', async () => {
    expect(await main(['', ''])).toBe(0);
  });
});

// describe('CLI echoes', () => {
//   beforeEach(async () => {
//     dataDir = await fs.promises.mkdtemp(
//       path.join(os.tmpdir(), 'polykey-test-'),
//     );
//     polykeyAgent = new PolykeyAgent({
//       nodePath: dataDir,
//       logger: logger,
//     });
//     await polykeyAgent.start({
//       password: 'password',
//     });
//   });

//   afterEach(async () => {
//     await polykeyAgent.stop();
//   });

//   test('should echo', async () => {
//     const result = await pk(['echoes', 'echo', '-np', dataDir, 'HelloWorld']);
//     expect(result).toBe(0);
//   });

//   test('should cause error', async () => {
//     const result = await pk(['echoes', 'echo', '-np', dataDir, 'ThrowAnError']);
//     expect(result).toBe(1);
//   });
// });
