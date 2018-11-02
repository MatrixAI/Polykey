import test from 'ava';
import Library from '../lib/tmp/Library.js';

test('give me a 1', t => {
  const lib = new Library;
  t.is(lib.getOne(), 1);
});
