import type { PermissionId } from './types';

import base58 from 'bs58';
import { utils as keysUtils } from '../keys';

async function generatePermId(): Promise<PermissionId> {
  const id = await keysUtils.getRandomBytes(32);
  return base58.encode(id) as PermissionId;
}

export { generatePermId };
