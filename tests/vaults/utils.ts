import type { VaultActions } from '@/vaults/types';
import fc from 'fast-check';
import { vaultActions } from '@/vaults/types';

const vaultActionArb = fc.constantFrom(...vaultActions);

const vaultActionsArb = fc.dictionary(vaultActionArb, fc.constant(null), {
  minKeys: 0,
  maxKeys: vaultActions.length,
}) as fc.Arbitrary<VaultActions>;

export { vaultActionArb, vaultActionsArb };
