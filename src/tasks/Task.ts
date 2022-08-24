import type Queue from './Scheduler';
import type {
  TaskId,
  TaskData,
  TaskHandlerId,
  TaskTimestamp,
  TaskDelay,
  TaskPriority,
  TaskHandler,
  TaskParameters,
} from './types';
import type { DeepReadonly } from '../types';

// Class TaskPromise<T> extends Promise<T> {
//
//   public constructor(executor, queue, lazy) {
//     super(executor);
//     this.lazy = lazy;
//     this.queue = queue;
//   }
//
//   public then() {
//     if (this.lazy) {
//       this.queue.f();
//       // attach event handlers
//     } else {
//
//     }
//   }
//
// }

class Task<T> {
  public readonly id: TaskId;
  public readonly handlerId: TaskHandlerId;
  public readonly parameters: DeepReadonly<TaskParameters>;
  public readonly timestamp: TaskTimestamp;
  public readonly delay: TaskDelay;
  public readonly priority: TaskPriority;

  protected queue: Queue;
  protected taskPromise: Promise<T> | undefined;

  constructor(
    queue: Queue,
    id: TaskId,
    handlerId: TaskHandlerId,
    parameters: TaskParameters,
    timestamp: TaskTimestamp,
    delay: TaskDelay,
    priority: TaskPriority,
    taskPromise: Promise<T>,
  ) {
    // I'm not sure about the queue
    // but if this is the reference here
    // then we need to add the event handler into the queue to wait for this
    this.queue = queue;

    this.id = id;
    this.handlerId = handlerId;
    this.parameters = parameters;
    this.timestamp = timestamp;
    this.delay = delay;
    this.priority = priority;
    this.taskPromise = taskPromise;
  }

  public toJSON(): TaskData & { id: TaskId } {
    return {
      id: this.id,
      handlerId: this.handlerId,
      // TODO: change this to `structuredClone` when available
      parameters: JSON.parse(JSON.stringify(this.parameters)),
      timestamp: this.timestamp,
      delay: this.delay,
      priority: this.priority,
    };
  }

  get promise() {
    if (this.taskPromise != null) return this.taskPromise;
    // Otherwise, we need to create a new one
    return new Promise((_, reject) => {
      reject(Error('not implemented'));
    });
  }
}

// Const t = new Task();

const p = new Promise<void>((resolve, reject) => {
  resolve();
});

p.then;
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
