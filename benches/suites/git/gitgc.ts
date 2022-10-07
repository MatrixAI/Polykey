import b from 'benny';
import { summaryName, suiteCommon } from '../../utils';

async function main() {
  let map = new Map();
  let obj = {};
  let arr: any = [];
  let set = new Set();
  const summary = await b.suite(
    summaryName(__filename),
    b.add('map', async () => {
      map = new Map();
      return async () => {
        for (let i = 0; i < 1000; i++) {
          map.set(i, undefined);
        }
        for (let i = 0; i < 1000; i++) {
          map.delete(i);
        }
        for (const _i of map) {
          // NOOP
        }
      };
    }),
    b.add('obj', async () => {
      obj = {};
      return async () => {
        for (let i = 0; i < 1000; i++) {
          obj[i] = undefined;
        }
        for (let i = 0; i < 1000; i++) {
          delete obj[i];
        }
        for (const _i in obj) {
          // NOOP
        }
      };
    }),
    b.add('arr', async () => {
      // You first have to count the number of objects
      arr = [];
      return async () => {
        // You have to iterate for each object
        // then for each value in length
        for (let i = 0; i < 1000; i++) {
          if (i === arr.length) {
            // Double the vector
            arr.length = arr.length * 2 || 2;
          }
          arr[i] = { id: i, mark: false };
          // Arr.push({ id: i, mark: false});
        }
        // This has to iterate the length of the array
        // but stop as soon as it reaches the end
        // it gets complicate, but for 5x improvement
        // it could be interesting
        for (let i = 0; i < 1000; i++) {
          arr[i].mark = true;
        }
        for (let i = 0; i < 1000; i++) {
          if (arr[i].mark === false) {
            // NOOP
          }
        }
      };
    }),
    b.add('set', async () => {
      set = new Set();
      return async () => {
        for (let i = 0; i < 1000; i++) {
          set.add(i);
        }
        for (let i = 0; i < 1000; i++) {
          set.delete(i);
        }
        for (const _i of set) {
          // NOOP
        }
      };
    }),
    ...suiteCommon,
  );
  return summary;
}

if (require.main === module) {
  void main();
}

export default main;
