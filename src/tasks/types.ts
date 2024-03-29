import type {
  TaskHandlerId,
  TaskId,
  TaskIdString,
  TaskIdEncoded,
} from '../ids/types';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { ContextTimed } from '@matrixai/contexts';
import type { Opaque } from '../types';

type TaskHandler = (
  ctx: ContextTimed,
  taskInfo: TaskInfo,
  ...params: TaskParameters
) => PromiseLike<any>;

/**
 * Task POJO returned to the user
 */
type Task = {
  id: TaskId;
  status: TaskStatus;
  promise: () => PromiseCancellable<any>;
  cancel: (reason: any) => void;
  handlerId: TaskHandlerId;
  parameters: TaskParameters;
  delay: number;
  priority: number;
  deadline: number;
  path: TaskPath;
  created: Date;
  scheduled: Date;
};

/**
 * Task data decoded for the task handler
 */
type TaskInfo = Omit<Task, 'status' | 'promise' | 'cancel'>;

/**
 * Task data that will be encoded into JSON for persistence
 */
type TaskData = {
  handlerId: TaskHandlerId;
  parameters: TaskParameters;
  timestamp: TaskTimestamp;
  delay: TaskDelay;
  deadline: TaskDeadline;
  priority: TaskPriority;
  path: TaskPath;
};

/**
 * Task state machine diagram
 *        ┌───────────┐
 *        │           │
 * ───────► Scheduled │
 *        │           │
 *        └─────┬─────┘
 *        ┌─────▼─────┐
 *        │           │
 *        │  Queued   │
 *        │           │
 *        └─────┬─────┘
 *        ┌─────▼─────┐
 *        │           │
 *        │  Active   │
 *        │           │
 *        └───────────┘
 */
type TaskStatus = 'scheduled' | 'queued' | 'active';

/**
 * Task parameters
 */
type TaskParameters = Array<any>;

/**
 * Timestamp unix time in milliseconds
 */
type TaskTimestamp = Opaque<'TaskTimestamp', number>;

/**
 * Timestamp milliseconds is a number between 0 and maximum timeout
 * It is not allowed for there to be an infinite delay
 */
type TaskDelay = Opaque<'TaskDelay', number>;

/**
 * Deadline milliseconds is a number between 0 and maximum timeout
 * or it can be `null` to indicate `Infinity`
 */
type TaskDeadline = Opaque<'TaskDeadline', number | null>;

/**
 * Task priority is an `uint8` [0 to 255]
 * Where `0` is the highest priority and `255` is the lowest priority
 */
type TaskPriority = Opaque<'TaskPriority', number>;

/**
 * Task Path, a LevelPath
 */
type TaskPath = Array<string>;

export type {
  TaskHandlerId,
  TaskHandler,
  TaskId,
  TaskIdString,
  TaskIdEncoded,
  Task,
  TaskInfo,
  TaskData,
  TaskStatus,
  TaskParameters,
  TaskTimestamp,
  TaskDelay,
  TaskDeadline,
  TaskPriority,
  TaskPath,
};
