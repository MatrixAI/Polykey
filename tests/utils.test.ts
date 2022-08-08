import os from 'os';
import path from 'path';
import process from 'process';
import * as utils from '@/utils';
import PromiseCancellable from '@/utils/PromiseCancellable';

describe('utils', () => {
  test('getting default node path', () => {
    const homeDir = os.homedir();
    const prefix = 'polykey';
    const p = utils.getDefaultNodePath();
    expect(p).toBeDefined();
    if (process.platform === 'linux') {
      const dataDir = process.env.XDG_DATA_HOME;
      if (dataDir != null) {
        expect(p).toBe(path.join(dataDir, prefix));
      } else {
        expect(p).toBe(path.join(homeDir, '.local', 'share', prefix));
      }
    } else if (process.platform === 'darwin') {
      expect(p).toBe(
        path.join(homeDir, 'Library', 'Application Support', 'polykey'),
      );
    } else if (process.platform === 'win32') {
      const appDataDir = process.env.LOCALAPPDATA;
      if (appDataDir != null) {
        expect(p).toBe(path.join(appDataDir, prefix));
      } else {
        expect(p).toBe(path.join(homeDir, 'AppData', 'Local', prefix));
      }
    }
  });
});
