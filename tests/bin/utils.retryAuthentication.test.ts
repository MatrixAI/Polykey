import prompts from 'prompts';
import { mocked } from 'jest-mock';
import mockedEnv from 'mocked-env';
import { utils as clientUtils, errors as clientErrors } from '@/client';
import * as binUtils from '@/bin/utils';
import { testIf } from '../utils';
import { isTestPlatformEmpty } from '../utils/platform';

jest.mock('prompts');
const mockedPrompts = mocked(prompts.prompt);

describe('bin/utils retryAuthentication', () => {
  testIf(isTestPlatformEmpty)('no retry on success', async () => {
    const mockCallSuccess = jest.fn().mockResolvedValue('hello world');
    const result = await binUtils.retryAuthentication(mockCallSuccess);
    expect(mockCallSuccess.mock.calls.length).toBe(1);
    expect(result).toBe('hello world');
  });
  testIf(isTestPlatformEmpty)('no retry on generic error', async () => {
    const error = new Error('oh no');
    const mockCallFail = jest.fn().mockRejectedValue(error);
    await expect(binUtils.retryAuthentication(mockCallFail)).rejects.toThrow(
      /oh no/,
    );
    expect(mockCallFail.mock.calls.length).toBe(1);
  });
  testIf(isTestPlatformEmpty)(
    'no retry on unattended call with PK_TOKEN and PK_PASSWORD',
    async () => {
      const mockCallFail = jest
        .fn()
        .mockRejectedValue(new clientErrors.ErrorClientAuthMissing());
      const envRestore = mockedEnv({
        PK_TOKEN: 'hello',
        PK_PASSWORD: 'world',
      });
      await expect(binUtils.retryAuthentication(mockCallFail)).rejects.toThrow(
        clientErrors.ErrorClientAuthMissing,
      );
      envRestore();
      expect(mockCallFail.mock.calls.length).toBe(1);
    },
  );
  testIf(isTestPlatformEmpty)(
    'no retry on unattended call with PK_TOKEN',
    async () => {
      const mockCallFail = jest
        .fn()
        .mockRejectedValue(new clientErrors.ErrorClientAuthMissing());
      const envRestore = mockedEnv({
        PK_TOKEN: 'hello',
        PK_PASSWORD: undefined,
      });
      await expect(binUtils.retryAuthentication(mockCallFail)).rejects.toThrow(
        clientErrors.ErrorClientAuthMissing,
      );
      envRestore();
      expect(mockCallFail.mock.calls.length).toBe(1);
    },
  );
  testIf(isTestPlatformEmpty)(
    'no retry on unattended call with PK_PASSWORD',
    async () => {
      const mockCallFail = jest
        .fn()
        .mockRejectedValue(new clientErrors.ErrorClientAuthMissing());
      const envRestore = mockedEnv({
        PK_TOKEN: undefined,
        PK_PASSWORD: 'world',
      });
      await expect(binUtils.retryAuthentication(mockCallFail)).rejects.toThrow(
        clientErrors.ErrorClientAuthMissing,
      );
      envRestore();
      expect(mockCallFail.mock.calls.length).toBe(1);
    },
  );
  testIf(isTestPlatformEmpty)(
    'retry once on clientErrors.ErrorClientAuthMissing',
    async () => {
      const password = 'the password';
      mockedPrompts.mockClear();
      // Password prompt will return hello world
      mockedPrompts.mockImplementation(async (_opts: any) => {
        return { password };
      });
      // Call will reject with ErrorClientAuthMissing then succeed
      const mockCall = jest
        .fn()
        .mockRejectedValueOnce(new clientErrors.ErrorClientAuthMissing())
        .mockResolvedValue('hello world');
      // Make this an attended call
      const envRestore = mockedEnv({
        PK_TOKEN: undefined,
        PK_PASSWORD: undefined,
      });
      const result = await binUtils.retryAuthentication(mockCall);
      envRestore();
      // Result is successful
      expect(result).toBe('hello world');
      // Call was tried 2 times
      expect(mockCall.mock.calls.length).toBe(2);
      // Prompted for password 1 time
      expect(mockedPrompts.mock.calls.length).toBe(1);
      // Authorization metadata was set
      const auth = mockCall.mock.calls[1][0].get('Authorization')[0];
      expect(auth).toBeDefined();
      expect(auth).toBe(
        clientUtils.encodeAuthFromPassword(password).get('Authorization')[0],
      );
      mockedPrompts.mockClear();
    },
  );
  testIf(isTestPlatformEmpty)(
    'retry 2 times on clientErrors.ErrorClientAuthDenied',
    async () => {
      const password1 = 'first password';
      const password2 = 'second password';
      mockedPrompts.mockClear();
      mockedPrompts
        .mockResolvedValueOnce({ password: password1 })
        .mockResolvedValue({ password: password2 });
      // Call will reject with ErrorClientAuthMissing then succeed
      const mockCall = jest
        .fn()
        .mockRejectedValueOnce(new clientErrors.ErrorClientAuthMissing())
        .mockRejectedValueOnce(new clientErrors.ErrorClientAuthDenied())
        .mockResolvedValue('hello world');
      // Make this an attended call
      const envRestore = mockedEnv({
        PK_TOKEN: undefined,
        PK_PASSWORD: undefined,
      });
      const result = await binUtils.retryAuthentication(mockCall);
      envRestore();
      // Result is successful
      expect(result).toBe('hello world');
      // Call was tried 3 times
      expect(mockCall.mock.calls.length).toBe(3);
      // Prompted for password 2 times
      expect(mockedPrompts.mock.calls.length).toBe(2);
      // Authorization metadata was set
      const auth = mockCall.mock.calls[2][0].get('Authorization')[0];
      expect(auth).toBeDefined();
      // Second password succeeded
      expect(auth).toBe(
        clientUtils.encodeAuthFromPassword(password2).get('Authorization')[0],
      );
      mockedPrompts.mockClear();
    },
  );
  testIf(isTestPlatformEmpty)(
    'retry 2+ times on clientErrors.ErrorClientAuthDenied until generic error',
    async () => {
      const password1 = 'first password';
      const password2 = 'second password';
      mockedPrompts.mockClear();
      mockedPrompts
        .mockResolvedValueOnce({ password: password1 })
        .mockResolvedValue({ password: password2 });
      // Call will reject with ErrorClientAuthMissing then succeed
      const mockCall = jest
        .fn()
        .mockRejectedValueOnce(new clientErrors.ErrorClientAuthMissing())
        .mockRejectedValueOnce(new clientErrors.ErrorClientAuthDenied())
        .mockRejectedValueOnce(new clientErrors.ErrorClientAuthDenied())
        .mockRejectedValueOnce(new clientErrors.ErrorClientAuthDenied())
        .mockRejectedValue(new Error('oh no'));
      // Make this an attended call
      const envRestore = mockedEnv({
        PK_TOKEN: undefined,
        PK_PASSWORD: undefined,
      });
      await expect(binUtils.retryAuthentication(mockCall)).rejects.toThrow(
        /oh no/,
      );
      envRestore();
      expect(mockCall.mock.calls.length).toBe(5);
      expect(mockedPrompts.mock.calls.length).toBe(4);
      const auth = mockCall.mock.calls[4][0].get('Authorization')[0];
      expect(auth).toBeDefined();
      // Second password was the last used
      expect(auth).toBe(
        clientUtils.encodeAuthFromPassword(password2).get('Authorization')[0],
      );
      mockedPrompts.mockClear();
    },
  );
});
