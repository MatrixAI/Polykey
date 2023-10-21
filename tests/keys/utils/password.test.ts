import * as password from '@/keys/utils/password';

describe('keys/utils/password', () => {
  test('password hashing ops limits raw numbers', () => {
    expect(password.passwordOpsLimits['min']).toBe(1);
    expect(password.passwordOpsLimits['interactive']).toBe(2);
    expect(password.passwordOpsLimits['moderate']).toBe(3);
    expect(password.passwordOpsLimits['sensitive']).toBe(4);
    expect(password.passwordOpsLimits['max']).toBe(4294967295);
    expect(password.passwordOpsLimitDefault).toBe(
      password.passwordOpsLimits['moderate'],
    );
  });
  test('password hashing mem limits raw numbers', () => {
    expect(password.passwordMemLimits['min']).toBe(8192);
    expect(password.passwordMemLimits['interactive']).toBe(67108864);
    expect(password.passwordMemLimits['moderate']).toBe(268435456);
    expect(password.passwordMemLimits['sensitive']).toBe(1073741824);
    expect(password.passwordMemLimits['max']).toBe(4294966272);
    expect(password.passwordMemLimitDefault).toBe(
      password.passwordMemLimits['moderate'],
    );
  });
});
