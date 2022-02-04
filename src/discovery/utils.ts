import type { DiscoveryQueueId, DiscoveryQueueIdGenerator } from './types';
import { IdSortable } from '@matrixai/id';
import { makeId } from '../GenericIdTypes';

function makeDiscoveryQueueId(arg: any) {
  return makeId<DiscoveryQueueId>(arg);
}

function createDiscoveryQueueIdGenerator(
  lastId?: DiscoveryQueueId,
): DiscoveryQueueIdGenerator {
  const idSortableGenerator = new IdSortable({
    lastId,
  });
  return (): DiscoveryQueueId =>
    makeDiscoveryQueueId(idSortableGenerator.get());
}

export { makeDiscoveryQueueId, createDiscoveryQueueIdGenerator };
