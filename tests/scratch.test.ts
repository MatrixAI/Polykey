import type { DB } from '@matrixai/db';
import type TaskManager from '@/tasks/TaskManager';
import type KeyManager from '@/keys/KeyManager';
import type NodeConnectionManager from '@/nodes/NodeConnectionManager';
import type NodeGraph from '@/nodes/NodeGraph';
import type Sigchain from '@/sigchain/Sigchain';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import NodeManager from '@/nodes/NodeManager';

// This is a 'scratch paper' test file for quickly running tests in the CI
describe('scratch', () => {
  const logger = new Logger(`${NodeManager.name} test`, LogLevel.INFO, [
    new StreamHandler(),
  ]);

  test('Should have unique HandlerIds', async () => {
    const nodeManager = new NodeManager({
      db: {} as DB,
      sigchain: {} as Sigchain,
      keyManager: {} as KeyManager,
      nodeGraph: {} as NodeGraph,
      nodeConnectionManager: {} as NodeConnectionManager,
      taskManager: {} as TaskManager,
      logger,
    });
    logger.info('checking names');
    logger.info(nodeManager.refreshBucketHandlerId);
    logger.info(nodeManager.gcBucketHandlerId);
    logger.info(nodeManager.pingAndSetNodeHandlerId);
    logger.info('end of names');
    expect(nodeManager.gcBucketHandlerId).not.toEqual(
      nodeManager.refreshBucketHandlerId,
    );
    expect(nodeManager.gcBucketHandlerId).not.toEqual(
      nodeManager.pingAndSetNodeHandlerId,
    );
    expect(nodeManager.refreshBucketHandlerId).not.toEqual(
      nodeManager.pingAndSetNodeHandlerId,
    );
  });
});

// We can't have empty test files so here is a sanity test
test('Should avoid empty test suite', async () => {
  expect(1 + 1).toBe(2);
});
