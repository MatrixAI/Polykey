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
import type Scheduler from './Scheduler';

class Task<T> {
  public readonly id: TaskId;
  public readonly handlerId: TaskHandlerId;
  public readonly parameters: DeepReadonly<TaskParameters>;
  public readonly timestamp: TaskTimestamp;
  public readonly delay: TaskDelay;
  public readonly priority: TaskPriority;

  // Protected queue: Queue;
  // protected taskPromise: Promise<T> | undefined;
  protected scheduler: Scheduler;

  constructor(
    scheduler: Scheduler,
    id: TaskId,
    handlerId: TaskHandlerId,
    parameters: TaskParameters,
    timestamp: TaskTimestamp,
    delay: TaskDelay,
    priority: TaskPriority,
    // TaskPromise: Promise<T>,
  ) {
    // I'm not sure about the queue
    // but if this is the reference here
    // then we need to add the event handler into the queue to wait for this
    // this.queue = queue;

    this.id = id;
    this.handlerId = handlerId;
    this.parameters = parameters;
    this.timestamp = timestamp;
    this.delay = delay;
    this.priority = priority;
    this.scheduler = scheduler;
    // This.taskPromise = taskPromise;
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
    return this.scheduler.getTaskP(this.id);
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
