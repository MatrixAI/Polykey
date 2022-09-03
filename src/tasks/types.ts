import type { LevelPath } from '@matrixai/db';
import type { Id } from '@matrixai/id';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { POJO, Opaque, Callback } from '../types';
import type { ContextTimed } from '../contexts/types';

type TaskId = Opaque<'TaskId', Id>;
type TaskIdString = Opaque<'TaskIdString', string>;
type TaskIdEncoded = Opaque<'TaskIdEncoded', string>;

/**
 * Timestamp unix time in milliseconds
 */
type TaskTimestamp = number;


type TaskParameters = Array<any>;

/**
 * Timestamp is millisecond number >= 0
 */
type TaskDelay = Opaque<'TaskDelay', number>;

/**
 * Task priority is an `uint8` [0 to 255]
 * Where `0` is the highest priority and `255` is the lowest priority
 */
type TaskPriority = Opaque<'TaskPriority', number>;

/**
 * Deadline in milliseconds
 */
type TaskDeadline = Opaque<'TaskDeadline', number>;

/**
 * Task Path, a LevelPath
 */
type TaskPath = LevelPath;

/**
 * Task state machine diagram
 *        ┌───────────┐
 *        │           │
 * ───────► Scheduled ├────────┐
 *        │           │        │
 *        └─────┬─────┘        │
 *        ┌─────▼─────┐        │
 *        │           │        │
 * ───────►  Queued   ├────────┤
 *        │           │        │
 *        └─────┬─────┘        │
 *        ┌─────▼─────┐        │
 *        │           │        │
 *        │  Active   ├────────┤
 *        │           │        │
 *        └─────┬─────┘        │
 *        ┌─────▼─────┐  ┌─────▼─────┐
 *        │┼─────────┼│  │┼─────────┼│
 *        ││Completed││  ││ Failed  ││
 *        │┼─────────┼│  │┼─────────┼│
 *        └───────────┘  └───────────┘
 */
type TaskStatus = 'scheduled'
                | 'queued'
                | 'active'
                | 'completed'
                | 'failed';

/**
 * Task data to be persisted
 */
type TaskData = {
  handlerId: TaskHandlerId;
  parameters: TaskParameters;
  timestamp: TaskTimestamp;
  delay: TaskDelay;
  priority: TaskPriority;
  deadline: TaskDeadline;
  path: TaskPath;
};

/**
 * Task POJO returned to the user
 */
type Task = {
  id: TaskId;
  status: TaskStatus;
  promise: PromiseCancellable<any>;
  handlerId: TaskHandlerId;
  parameters: TaskParameters;
  delay: number;
  priority: number;
  deadline: number;
  path: TaskPath;
  created: Date;
  scheduled: Date;
};

type TaskHandlerId = Opaque<'TaskHandlerId', string>;

type TaskHandler = (
  ...params: [ ...TaskParameters, ContextTimed ]
) => Promise<any>;

/**
 * Task function is the result of a lambda abstraction of applying
 * `TaskHandler` to its respective parameters
 * This is what gets executed
 */
type TaskFunction<T> = () => Promise<T>;

export type {
  TaskId,
  TaskIdString,
  TaskIdEncoded,
  Task,
  TaskPath,
  TaskData,
  TaskHandlerId,
  TaskHandler,
  TaskPriority,
  // TaskListener
  TaskParameters,
  TaskTimestamp,
  TaskDelay,
  TaskStatus,
  TaskDeadline,
};
