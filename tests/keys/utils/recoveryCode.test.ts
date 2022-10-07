import {
  generateRecoveryCode,
  validateRecoveryCode,
} from '@/keys/utils/recoveryCode';

describe('keys/utils/recoveryCode', () => {
  test('generates recovery code', async () => {
    for (let i = 0; i < 100; i++) {
      const recoveryCode1 = generateRecoveryCode();
      expect(recoveryCode1.split(' ')).toHaveLength(24);
      const recoveryCode24 = generateRecoveryCode();
      expect(recoveryCode24.split(' ')).toHaveLength(24);
      const recoveryCode12 = generateRecoveryCode(12);
      expect(recoveryCode12.split(' ')).toHaveLength(12);
      expect(validateRecoveryCode(recoveryCode1)).toBe(true);
      expect(validateRecoveryCode(recoveryCode24)).toBe(true);
      expect(validateRecoveryCode(recoveryCode12)).toBe(true);
    }
  });
});
