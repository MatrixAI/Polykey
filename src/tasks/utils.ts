import type { TaskId, TaskIdEncoded, TaskPriority, TaskDelay, TaskDeadline } from './types';
import { IdInternal, IdSortable } from '@matrixai/id';
import * as utils from '../utils';

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

/**
 * Encodes delay milliseconds
 */
function toDelay(delay: number): TaskDelay {
  if (isNaN(delay)) {
    delay = 0;
  } else {
    delay = Math.max(delay, 0);
    delay = Math.min(delay, 2**31 - 1);
  }
  return delay as TaskDelay;
}

/**
 * Decodes task delay
 */
function fromDelay(taskDelay: TaskDelay): number {
  return taskDelay;
}

/**
 * Encodes deadline milliseconds
 * If deadline is `Infinity`, it is encoded as `null`
 * If deadline is `NaN, it is encoded as `0`
 */
function toDeadline(deadline: number): TaskDeadline {
  let taskDeadline: number | null;
  if (isNaN(deadline)) {
    taskDeadline = 0;
  } else {
    taskDeadline = Math.max(deadline, 0);
    // Infinity is converted to `null` because `Infinity` is not supported in JSON
    if (!isFinite(taskDeadline)) taskDeadline = null;
  }
  return taskDeadline as TaskDeadline;
}

/**
 * Decodes task deadline
 * If task deadline is `null`, it is decoded as `Infinity`
 */
function fromDeadline(taskDeadline: TaskDeadline): number {
  if (taskDeadline == null) return Infinity;
  return taskDeadline;
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

export {
  createTaskIdGenerator,
  encodeTaskId,
  decodeTaskId,
  toDelay,
  fromDelay,
  toDeadline,
  fromDeadline,
  toPriority,
  fromPriority,
};
