import type { DBDomain } from './types';

import sublevelprefixer from 'sublevel-prefixer';
import * as dbErrors from './errors';

const prefixer = sublevelprefixer('!');

function domainPath(levels: DBDomain, key: string | Buffer): string | Buffer {
  if (!levels.length) {
    return key;
  }
  let prefix = key;
  for (let i = levels.length - 1; i >= 0; i--) {
    prefix = prefixer(levels[i], prefix);
  }
  return prefix;
}

function serialize<T>(value: T): Buffer {
  return Buffer.from(JSON.stringify(value), 'utf-8');
}

function deserialize<T>(value_: Buffer): T {
  try {
    return JSON.parse(value_.toString('utf-8'));
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new dbErrors.ErrorDBParse();
    }
    throw e;
  }
}

export { domainPath, serialize, deserialize };
