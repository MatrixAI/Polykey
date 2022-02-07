import b from 'benny';
import packageJson from '../package.json';

async function main () {
  let map = new Map();
  let obj = {};
  let arr = [];
  let set = new Set();
  const summary = await b.suite(
    'gitgc',
    b.add('map', async () => {
      map = new Map();
      return async () => {
        for (let i = 0; i < 1000; i++) {
          map.set(i, undefined);
        }
        for (let i = 0; i < 1000; i++) {
          map.delete(i);
        }
        for (const i of map) {
          // NOOP
        }
      }
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
        for (const i in obj) {
          // NOOP
        }
      };
    }),
    b.add('arr', async () => {
      // you first have to count the number of objects
      arr = [];
      return async () => {
        // you have to iterate for each object
        // then for each value in length
        for (let i = 0; i < 1000; i++) {
          if (i === arr.length) {
            // double the vector
            arr.length = arr.length * 2 || 2;
          }
          arr[i] = { id: i, mark: false };
          // arr.push({ id: i, mark: false});
        }
        // this has to iterate the length of the array
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
        for (const i of set) {
          // NOOP
        }
      };
    }),
    b.cycle(),
    b.complete(),
    b.save({
      file: 'gitgc',
      folder: 'benches/results',
      version: packageJson.version,
      details: true,
    }),
    b.save({
      file: 'gitgc',
      folder: 'benches/results',
      format: 'chart.html',
    }),
  );
  return summary;
}

if (require.main === module) {
  (async () => {
    await main();
  })();
}

export default main;
