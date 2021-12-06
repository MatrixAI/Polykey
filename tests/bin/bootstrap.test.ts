import os from 'os';
import path from 'path';
import fs from 'fs';
import * as utils from './utils';

describe('CLI bootstrap', () => {
  let dataDir: string;
  let passwordFile: string;
  let nodePath: string;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    passwordFile = path.join(dataDir, 'passwordFile');
    nodePath = path.join(dataDir, 'testnode');
    await fs.promises.writeFile(passwordFile, 'password');
  });
  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test(
    "Should create keynode state if directory doesn't exist.",
    async () => {
      const result = await utils.pkStdio([
        'bootstrap',
        '-np',
        nodePath,
        '--password-file',
        passwordFile,
      ]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.split(' ')).toHaveLength(24);
    },
    global.polykeyStartupTimeout * 2,
  );
  test(
    'Should create keynode state if directory is empty.',
    async () => {
      await fs.promises.mkdir(nodePath);
      const result = await utils.pkStdio([
        'bootstrap',
        '-np',
        nodePath,
        '--password-file',
        passwordFile,
        '-vvvv',
      ]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.split(' ')).toHaveLength(24);
    },
    global.polykeyStartupTimeout * 2,
  );
  test(
    'Should generate a recovery code when creating state.',
    async () => {
      await fs.promises.mkdir(nodePath);
      const result = await utils.pkStdio([
        'bootstrap',
        '-np',
        nodePath,
        '--password-file',
        passwordFile,
      ]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.split(' ')).toHaveLength(24);
    },
    global.polykeyStartupTimeout * 3,
  );
  test(
    'concurrent bootstrapping',
    async () => {
      await fs.promises.mkdir(nodePath);

      // Bootstrapping two nodes at the same time.
      const results = await Promise.all([
        utils.pkStdio([
          'bootstrap',
          '-np',
          nodePath,
          '--password-file',
          passwordFile,
        ]),
        utils.pkStdio([
          'bootstrap',
          '-np',
          nodePath,
          '--password-file',
          passwordFile,
        ]),
      ]);

      // 1 fails and 1 succeeds.

      expect(JSON.stringify(results)).toContain(':0');
      expect(JSON.stringify(results)).toContain(':75');
    },
    global.defaultTimeout * 4,
  );
});
