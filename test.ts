import * as errors from './src/errors'
import { replacer, reviver, sensitiveReplacer } from './src/ErrorPolykeyRemote';

const e1 = new errors.ErrorPolykey('some error', {
  data: { int: 1, str: 'string' },
  cause: new TypeError('some type error'),
});
const e2 = new errors.ErrorACLNodeIdMissing('not present', { cause: e1 });
// const stringified = JSON.stringify(e1, replacer, 2);
// // console.log(stringified);
// const parsed = fromJSON(JSON.parse(stringified, reviver));
// console.log(parsed);

const s = JSON.stringify(e2, sensitiveReplacer, 2);
console.log(s);
console.log(JSON.parse(s, reviver));
