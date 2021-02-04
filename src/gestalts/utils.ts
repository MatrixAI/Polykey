import type { GestaltKey } from './types';
import type { IdentityKey, ProviderKey, PeerId } from '../types';

function gestaltKey(key: PeerId | IdentityKey, providerKey: ProviderKey | null = null): GestaltKey {
  return JSON.stringify({ p: providerKey, key: key });
}

function ungestaltKey(gestaltKey: GestaltKey): PeerId | IdentityKey {
  return JSON.parse(gestaltKey).key;
}

export {
  gestaltKey,
  ungestaltKey
};
