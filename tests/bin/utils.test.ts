import os from 'os';
import * as utils from '@/utils';
import * as binUtils from '@/bin/utils';

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
  test('list in human and json format', () => {
    // List
    expect(
      binUtils.outputFormatter({
        type: 'list',
        data: ['Testing', 'the', 'list', 'output'],
      }),
    ).toBe('Testing\nthe\nlist\noutput\n');
    // JSON
    expect(
      binUtils.outputFormatter({
        type: 'json',
        data: ['Testing', 'the', 'list', 'output'],
      }),
    ).toBe('["Testing","the","list","output"]');
  });
  test('table in human and in json format', () => {
    // Table
    expect(
      binUtils.outputFormatter({
        type: 'table',
        data: [
          { key1: 'value1', key2: 'value2' },
          { key1: 'data1', key2: 'data2' },
        ],
      }),
    ).toBe('key1\tkey2\nvalue1\tvalue2\ndata1\tdata2\n');
    // JSON
    expect(
      binUtils.outputFormatter({
        type: 'json',
        data: [
          { key1: 'value1', key2: 'value2' },
          { key1: 'data1', key2: 'data2' },
        ],
      }),
    ).toBe(
      '[{"key1":"value1","key2":"value2"},{"key1":"data1","key2":"data2"}]',
    );
  });
  test('dict in human and in json format', () => {
    // Dict
    expect(
      binUtils.outputFormatter({
        type: 'dict',
        data: { key1: 'value1', key2: 'value2' },
      }),
    ).toBe('key1:\tvalue1\nkey2:\tvalue2\n');
    // JSON
    expect(
      binUtils.outputFormatter({
        type: 'json',
        data: { key1: 'value1', key2: 'value2' },
      }),
    ).toBe('{"key1":"value1","key2":"value2"}');
  });
});
