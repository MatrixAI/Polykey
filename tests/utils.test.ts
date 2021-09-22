import os from 'os';
import process from 'process';
import * as utils from '@/utils';

describe('utils', () => {
  test('getting default node path', () => {
    const homeDir = os.homedir();
    const p = utils.getDefaultNodePath();
    if (process.platform === 'linux') {
      expect(p).toBe(`${homeDir}/.local/share/polykey`);
    } else if (process.platform === 'darwin') {
      expect(p).toBe(`${homeDir}/Library/Application Support/polykey`);
    } else if (process.platform === 'win32') {
      expect(p).toBe(`${homeDir}/AppData/Local/polykey`);
    }
  });
});
