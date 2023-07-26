import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import NodeManager from '@/nodes/NodeManager';

// This is a 'scratch paper' test file for quickly running tests in the CI
describe('scratch', () => {
  const _logger = new Logger(`${NodeManager.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
});

// We can't have empty test files so here is a sanity test
test('Should avoid empty test suite', async () => {
  expect(1 + 1).toBe(2);
});
