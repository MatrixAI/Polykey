import sublevelprefixer from 'sublevel-prefixer';
import * as dbErrors from './errors';
import { utils as keysUtils } from '../keys';

const prefixer = sublevelprefixer('!');

function domainPath(levels: Array<string>, key: string): string {
  if (!levels.length) {
    return key;
  }
  let prefix = key;
  for (let i = levels.length - 1; i >= 0; i--) {
    prefix = prefixer(levels[i], prefix);
  }
  return prefix;
}

function serializeEncrypt<T>(key: Buffer, value: T): Buffer {
  return keysUtils.encryptWithKey(
    key,
    Buffer.from(JSON.stringify(value), 'utf-8'),
  );
}

function unserializeDecrypt<T>(key: Buffer, data: Buffer): T {
  const value_ = keysUtils.decryptWithKey(key, data);
  if (!value_) {
    throw new dbErrors.ErrorDBDecrypt();
  }
  let value: T;
  try {
    value = JSON.parse(value_.toString('utf-8'));
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new dbErrors.ErrorDBParse();
    }
    throw e;
  }
  return value;
}

export { domainPath, serializeEncrypt, unserializeDecrypt };
