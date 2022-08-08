import type { TaskId, TaskPriority } from './types';
import type { NodeId } from '../nodes/types';
import { IdSortable } from '@matrixai/id';

/**
 * Generates TaskId
 * TaskIds are lexicographically sortable 128 bit IDs
 * They are strictly monotonic and unique with respect to the `nodeId`
 * When the `NodeId` changes, make sure to regenerate this generator
 */
function createTaskIdGenerator(nodeId: NodeId, lastTaskId?: TaskId) {
  const generator = new IdSortable<TaskId>({
    lastId: lastTaskId,
    nodeId,
  });
  return () => generator.get();
}

/**
 * Converts `int8` to flipped `uint8` task priority
 * Clips number to between -128 to 127 inclusive
 */
function toPriority(n: number): TaskPriority {
  n = Math.min(n, 127);
  n = Math.max(n, -128);
  n *= -1
  n -= 1
  n += 128;
  return n as TaskPriority;
}

/**
 * Converts flipped `uint8` task priority to `int8`
 */
function fromPriority(p: TaskPriority): number {
  let n = p - 128;
  n += 1;
  // Prevent returning `-0`
  if (n !== 0) n *= -1;
  return n;
}

export {
  createTaskIdGenerator,
  toPriority,
  fromPriority
};
