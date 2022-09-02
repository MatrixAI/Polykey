import type { Id } from '@matrixai/id';
import type { POJO, Opaque, Callback } from '../types';
import type { LevelPath } from '@matrixai/db';

type TaskId = Opaque<'TaskId', Id>;
type TaskIdString = Opaque<'TaskIdString', string>;
type TaskIdEncoded = Opaque<'TaskIdEncoded', string>;

/**
 * Timestamp unix time in milliseconds
 */
type TaskTimestamp = number;

/**
 * Timestamp is millisecond number >= 0
 */
type TaskDelay = number;

type TaskParameters = Array<any>;

/**
 * Task priority is an `uint8` [0 to 255]
 * Where `0` is the highest priority and `255` is the lowest priority
 */
type TaskPriority = Opaque<'TaskPriority', number>;

/**
 * Task Path, a LevelPath
 */
type TaskPath = LevelPath;

/**
 * Task data to be persisted
 */
type TaskData = {
  handlerId: TaskHandlerId;
  parameters: TaskParameters;
  timestamp: TaskTimestamp;
  // Delay: TaskDelay;
  path: TaskPath | undefined;
  priority: TaskPriority;
};

/**
 * Task information that is returned to the user
 */
type TaskInfo = TaskData & {
  id: TaskId;
};

type TaskHandlerId = Opaque<'TaskHandlerId', string>;

// Type TaskHandler<P extends Array<any> = [], R = any> = (
//   ...params: P
// ) => Promise<R>;

type TaskHandler = (...params: Array<any>) => Promise<any>;

/**
 * Task function is the result of a lambda abstraction of applying
 * `TaskHandler` to its respective parameters
 * This is what gets executed
 */
type TaskFunction<T> = () => Promise<T>;

// Type TaskListener = Callback<[taskResult: any], void>;
// Make Task something that can be awaited on
// but when you "make" a promise or reference it
// you're for a promise
// that will resolve an event occurs
// or reject when an event occurs
// and the result of the execution
// now the exeuction of the event itself is is going to return ap romise
// something must be lisetning to it
// If you have a Record
// it has to be TaskIdString
// you can store things in it
// type X = Record<Id, string>;
// Task is the lowest level
// TaskData is low level
// TaskInfo is high level
// TaskId
// Task <- lazy promise
// TaskData <- low level data of a task (does not include id)
// TaskInfo <- high level (includes id)
// This is a lazy promise
// it's a promise of something that may not yet immediately executed
// type TaskPromise<T> = Promise<T>;
// Consider these variants... (should standardise what these are to be used)
// Task
// Tasks (usually a record, sometimes an array)
// TaskData - lower level data of a task
// TaskInfo - higher level information that is inclusive of data
// type TaskData = Record<TaskIdEncoded, Task>;

export type {
  TaskId,
  TaskIdString,
  TaskIdEncoded,
  // Task,
  TaskPath,
  TaskData,
  TaskInfo,
  TaskHandlerId,
  TaskHandler,
  TaskPriority,
  // TaskListener
  TaskParameters,
  TaskTimestamp,
  TaskDelay,
};
