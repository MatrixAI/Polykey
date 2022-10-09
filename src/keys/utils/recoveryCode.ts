import type { RecoveryCode } from '../types';
import './webcrypto';
import * as bip39 from '@scure/bip39';
import { wordlist as bip39Wordlist } from '@scure/bip39/wordlists/english';

function generateRecoveryCode(size: 12 | 24 = 24): RecoveryCode {
  if (size === 12) {
    return bip39.generateMnemonic(bip39Wordlist, 128) as RecoveryCode;
  } else if (size === 24) {
    return bip39.generateMnemonic(bip39Wordlist, 256) as RecoveryCode;
  }
  throw RangeError(size);
}

function validateRecoveryCode(recoveryCode: string): recoveryCode is RecoveryCode {
  return bip39.validateMnemonic(recoveryCode, bip39Wordlist);
}

export { generateRecoveryCode, validateRecoveryCode };
