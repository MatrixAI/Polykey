import * as binUtils from '@/bin/utils';

describe('bin/utils', () => {
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
    ).toBe('key1\tvalue1\nkey2\tvalue2\n');
    expect(
      binUtils.outputFormatter({
        type: 'dict',
        data: { key1: 'first\nsecond', key2: 'first\nsecond\n' },
      }),
    ).toBe('key1\tfirst\n\tsecond\nkey2\tfirst\n\tsecond\n');
    // JSON
    expect(
      binUtils.outputFormatter({
        type: 'json',
        data: { key1: 'value1', key2: 'value2' },
      }),
    ).toBe('{"key1":"value1","key2":"value2"}');
  });
});
