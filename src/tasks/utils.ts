import type { TaskId, TaskIdEncoded, TaskPriority, TaskDelay } from './types';
import { IdInternal, IdSortable } from '@matrixai/id';

/**
 * Generates TaskId
 * TaskIds are lexicographically sortable 128 bit IDs
 * They are strictly monotonic and unique with respect to the `nodeId`
 * When the `NodeId` changes, make sure to regenerate this generator
 */
function createTaskIdGenerator(lastTaskId?: TaskId) {
  const generator = new IdSortable<TaskId>({
    lastId: lastTaskId,
  });
  return () => generator.get();
}

/**
 * Converts `int8` to flipped `uint8` task priority
 * Clips number to between -128 to 127 inclusive
 */
function toPriority(n: number): TaskPriority {
  if (isNaN(n)) n = 0;
  n = Math.min(n, 127);
  n = Math.max(n, -128);
  n *= -1;
  n -= 1;
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

// Max possible delay for `setTimeout()`
const maxTimeout = 2 ** 31 - 1;
/**
 * This clamps the delay to 0 inclusive and Infinity exclusive
 */
function toDelay(delay: number): TaskDelay {
  if (isNaN(delay)) delay = 0;
  delay = Math.max(delay, 0);
  delay = Math.min(delay, maxTimeout);
  return delay as TaskDelay;
}

/**
 * Encodes the TaskId as a `base32hex` string
 */
function encodeTaskId(taskId: TaskId): TaskIdEncoded {
  return taskId.toMultibase('base32hex') as TaskIdEncoded;
}

/**
 * Decodes an encoded TaskId string into a TaskId
 */
function decodeTaskId(taskIdEncoded: any): TaskId | undefined {
  if (typeof taskIdEncoded !== 'string') {
    return;
  }
  const taskId = IdInternal.fromMultibase<TaskId>(taskIdEncoded);
  if (taskId == null) {
    return;
  }
  // All TaskIds are 16 bytes long
  if (taskId.length !== 16) {
    return;
  }
  return taskId;
}

export {
  createTaskIdGenerator,
  toPriority,
  fromPriority,
  toDelay,
  encodeTaskId,
  decodeTaskId,
};
