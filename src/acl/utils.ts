import type { PermissionId } from './types';

import base58 from 'bs58';
import * as aclErrors from './errors';
import { utils as keysUtils } from '../keys';

async function generatePermId(): Promise<PermissionId> {
  const id = await keysUtils.getRandomBytes(32);
  return base58.encode(id) as PermissionId;
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
    throw new aclErrors.ErrorACLDecrypt();
  }
  let value;
  try {
    value = JSON.parse(value_.toString('utf-8'));
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new aclErrors.ErrorACLParse();
    }
    throw e;
  }
  return value;
}

export { generatePermId, serializeEncrypt, unserializeDecrypt };
