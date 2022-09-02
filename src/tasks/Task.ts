import type {
  TaskId,
  TaskData,
  TaskHandlerId,
  TaskTimestamp,
  TaskPriority,
  TaskParameters,
  TaskPath,
} from './types';
import type { DeepReadonly } from '../types';
import type Queue from './Queue';

// FIXME: this file isn't needed anymore?
class Task<T> {
  public readonly id: TaskId;
  public readonly handlerId: TaskHandlerId;
  public readonly parameters: DeepReadonly<TaskParameters>;
  public readonly timestamp: TaskTimestamp;
  // Public readonly delay: TaskDelay;
  public readonly path: TaskPath | undefined;
  public readonly priority: TaskPriority;

  protected taskPromise: Promise<T> | null;
  protected queue: Queue;

  constructor(
    queue: Queue,
    id: TaskId,
    handlerId: TaskHandlerId,
    parameters: TaskParameters,
    timestamp: TaskTimestamp,
    // Delay: TaskDelay,
    path: TaskPath | undefined,
    priority: TaskPriority,
    taskPromise: Promise<T> | null,
  ) {
    // I'm not sure about the queue
    // but if this is the reference here
    // then we need to add the event handler into the queue to wait for this
    // this.queue = queue;

    this.id = id;
    this.handlerId = handlerId;
    this.parameters = parameters;
    this.timestamp = timestamp;
    // This.delay = delay;
    this.path = path;
    this.priority = priority;
    this.queue = queue;
    this.taskPromise = taskPromise;
  }

  public toJSON(): TaskData & { id: TaskId } {
    return {
      id: this.id,
      handlerId: this.handlerId,
      // TODO: change this to `structuredClone` when available
      parameters: JSON.parse(JSON.stringify(this.parameters)),
      timestamp: this.timestamp,
      // Delay: this.delay,
      path: this.path,
      priority: this.priority,
    };
  }

  get promise() {
    if (this.taskPromise != null) return this.taskPromise;
    this.taskPromise = this.queue.getTaskP(this.id);
    return this.taskPromise;
  }
}

// Const t = new Task();
//
// const p = new Promise<void>((resolve, reject) => {
//   resolve();
// });
//
// p.then;
// P.catch
// p.finally
// /**
//  * Represents the completion of an asynchronous operation
//  */
// interface Promise<T> {
//     /**
//      * Attaches callbacks for the resolution and/or rejection of the Promise.
//      * @param onfulfilled The callback to execute when the Promise is resolved.
//      * @param onrejected The callback to execute when the Promise is rejected.
//      * @returns A Promise for the completion of which ever callback is executed.
//      */

//     /**
//      * Attaches a callback for only the rejection of the Promise.
//      * @param onrejected The callback to execute when the Promise is rejected.
//      * @returns A Promise for the completion of the callback.
//      */
//     catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult>;
// }

export default Task;
