import fc from 'fast-check';
import { test } from '@fast-check/jest';
import * as auditUtils from '@/audit/utils';

describe('Audit Utils', () => {
  const sortFn = (a: number, b: number): number => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  };
  const orderedNumberArrayArb = fc
    .array(fc.integer({ min: 0, max: 100 }))
    .map((array) => {
      array.sort(sortFn);
      return array;
    });

  /**
   * Checks if the array is strictly ordered without duplicate numbers
   */
  function expectSortedArray(data: Array<number>) {
    let previous: number | undefined;
    for (const datum of data) {
      if (previous == null) {
        previous = datum;
        continue;
      }
      if (!(previous <= datum)) {
        throw Error(`${previous} was not less than ${datum} in ${data}`);
      }
      if (previous === datum) {
        throw Error(`there should be no duplicate numbers`);
      }
    }
  }

  test('filterSubPaths', async () => {
    // Out of theses only `a.b`, `e` and `f` are top level parents
    const data = [
      ['a', 'b', 'c'],
      ['a', 'b', 'c'],
      ['a', 'b', 'e'],
      ['e', 'f'],
      ['e', 'g'],
      ['a', 'b'],
      ['e'],
      ['f'],
      ['f'],
    ];
    const filtered = auditUtils.filterSubPaths(data).map((v) => v.join('.'));
    expect(filtered).toHaveLength(3);
    expect(filtered).toInclude('a.b');
    expect(filtered).toInclude('e');
    expect(filtered).toInclude('f');
    expect(filtered).not.toInclude('a.b.c');
    expect(filtered).not.toInclude('a.b.c');
    expect(filtered).not.toInclude('a.b.e');
    expect(filtered).not.toInclude('e.f');
    expect(filtered).not.toInclude('e.g');
  });
  test.prop([fc.array(orderedNumberArrayArb).noShrink()])(
    'can combine strictly ordered iterators',
    async (generatorData) => {
      async function* gen(
        data: Array<number>,
      ): AsyncGenerator<number, void, void> {
        for (const datum of data) {
          yield datum;
        }
      }

      const expectedData: Set<number> = new Set();
      for (const data of generatorData) {
        for (const datum of data) {
          expectedData.add(datum);
        }
      }
      const expectedDataArray = [...expectedData];
      expectedDataArray.sort(sortFn);

      const gens = generatorData.map((data) => gen(data));
      const sortedGen = auditUtils.genSort<number>(sortFn, ...gens);
      const acc: Array<number> = [];
      for await (const value of sortedGen) {
        acc.push(value);
      }
      expectSortedArray(acc);
      expect(acc).toMatchObject(expectedDataArray);
    },
  );
  test('isAuditPath', async () => {
    for (const topicPath of auditUtils.topicPaths) {
      expect(auditUtils.isTopicPath(topicPath)).toBeTrue();
      // Parent paths are also valid
      expect(auditUtils.isTopicPath(topicPath.slice(0, 2))).toBeTrue();
      expect(auditUtils.isTopicPath(topicPath.slice(0, 1))).toBeTrue();
    }
    expect(auditUtils.isTopicPath(['invalid', 'invalid'])).toBeFalse();
  });
});
