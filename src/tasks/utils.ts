import type { TaskId, TaskIdEncoded, TaskPriority } from './types';
import type { NodeId } from '../nodes/types';
import { IdInternal, IdSortable } from '@matrixai/id';
import lexi from 'lexicographic-integer';

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

function makeTaskTimestampKey(time: number, taskId: TaskId): Buffer {
  const timestampBuffer = Buffer.from(lexi.pack(time));
  return Buffer.concat([timestampBuffer, taskId.toBuffer()]);
}

/**
 * Returns [taskTimestampBuffer, taskIdBuffer]
 */
function splitTaskTimestampKey(timestampBuffer: Buffer) {
  // Last 16 bytes are TaskId
  const splitPoint = timestampBuffer.length - 16;
  const timeBuffer = timestampBuffer.slice(0, splitPoint);
  const idBuffer = timestampBuffer.slice(splitPoint);
  return [timeBuffer, idBuffer];
}

function getPerformanceTime(): number {
  return performance.timeOrigin + performance.now();
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

class TaskEvent<T = any> extends Event {
  detail?: any;
  constructor(type: string, options?: CustomEventInit<T>) {
    super(type, options);
    this.detail = options?.detail;
  }
}

export {
  createTaskIdGenerator,
  toPriority,
  fromPriority,
  makeTaskTimestampKey,
  splitTaskTimestampKey,
  getPerformanceTime,
  encodeTaskId,
  decodeTaskId,
  TaskEvent,
};
