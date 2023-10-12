import type { RecoveryCode } from '../types';
import * as bip39 from '@scure/bip39';
import { wordlist as bip39Wordlist } from '@scure/bip39/wordlists/english';
import * as validationErrors from '../../validation/errors';

function generateRecoveryCode(size: 12 | 24 = 24): RecoveryCode {
  if (size === 12) {
    return bip39.generateMnemonic(bip39Wordlist, 128) as RecoveryCode;
  } else if (size === 24) {
    return bip39.generateMnemonic(bip39Wordlist, 256) as RecoveryCode;
  }
  throw RangeError(size);
}

function validateRecoveryCode(
  recoveryCode: string,
): recoveryCode is RecoveryCode {
  return bip39.validateMnemonic(recoveryCode, bip39Wordlist);
}

function parseRecoveryCode(data: any): RecoveryCode {
  if (typeof data !== 'string') {
    throw new validationErrors.ErrorParse('Recovery code must be a string');
  }
  if (data.length < 1) {
    throw new validationErrors.ErrorParse(
      'Recovery code length must be greater than 0',
    );
  }
  if (!validateRecoveryCode(data)) {
    throw new validationErrors.ErrorParse('Recovery code has invalid format');
  }
  return data;
}

export { generateRecoveryCode, validateRecoveryCode, parseRecoveryCode };
