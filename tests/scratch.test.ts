import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

// This is a 'scratch paper' test file for quickly running tests in the CI
describe('scratch', () => {
  const _logger = new Logger(`scratch test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);

  // We can't have empty test files so here is a sanity test
  test('Should avoid empty test suite', async () => {
    expect(1 + 1).toBe(2);
  });
});
