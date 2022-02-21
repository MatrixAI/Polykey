import type { DiscoveryQueueId, DiscoveryQueueIdGenerator } from './types';
import { IdSortable } from '@matrixai/id';

function createDiscoveryQueueIdGenerator(
  lastId?: DiscoveryQueueId,
): DiscoveryQueueIdGenerator {
  const idSortableGenerator = new IdSortable<DiscoveryQueueId>({
    lastId,
  });
  return (): DiscoveryQueueId => idSortableGenerator.get();
}

export { createDiscoveryQueueIdGenerator };
