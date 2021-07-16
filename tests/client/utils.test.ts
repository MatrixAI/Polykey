import fs from 'fs';
import os from 'os';
import path from 'path';

import * as utils from '@/client/utils';

describe('client/utils globbing correctly returns', () => {
  let dataDir: string;
  let opts;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    opts = { cwd: dataDir, absolute: false, filesOnly: true, flush: false }
    await fs.promises.mkdir(path.join(dataDir, 'dir1/dir2/dir3'), { recursive: true });
    await fs.promises.mkdir(path.join(dataDir, 'dir4'));
    await fs.promises.writeFile(path.join(dataDir, 'file1'), 'f1');
    await fs.promises.writeFile(path.join(dataDir, 'dir1/file2'), 'f2');
    await fs.promises.writeFile(path.join(dataDir, 'dir1/dir2/file3'), 'f3');
    await fs.promises.writeFile(path.join(dataDir, 'dir1/dir2/dir3/file4'), 'f4');
    await fs.promises.writeFile(path.join(dataDir, 'dir1/dir2/dir3/file5'), 'f5');
    await fs.promises.writeFile(path.join(dataDir, 'dir1/dir2/dir3/.file6'), 'f6');
    await fs.promises.writeFile(path.join(dataDir, 'dir4/file7'), 'f7');
    await fs.promises.writeFile(path.join(dataDir, 'dir4/.file8'), 'f8');
  });
  test('** lists all files in the cwd', async () => {
    const msg = [
      'file1',
      'dir1/file2',
      'dir1/dir2/file3',
      'dir1/dir2/dir3/file4',
      'dir1/dir2/dir3/file5',
      'dir1/dir2/dir3/.file6',
      'dir4/file7',
      'dir4/.file8',
    ]
    const res = await utils.glob(fs, '**/**/**', opts);
    expect(res.sort()).toStrictEqual(msg.sort());
  });
});
