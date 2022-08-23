import type Queue from "./Scheduler";
import type { TaskId, TaskData, TaskHandlerId, TaskTimestamp, TaskDelay, TaskPriority, TaskHandler, TaskParameters } from "./types";
import type { DeepReadonly } from '../types';

class TaskPromise<T> extends Promise<T> {

  public constructor(executor, queue, lazy) {
    super(executor);
    this.lazy = lazy;
    this.queue = queue;
  }

  public then() {
    if (this.lazy) {
      this.queue.f();
      // attach event handlers
    } else {

    }
  }

}

class Task<T> {
  public readonly id: TaskId;
  public readonly handlerId: TaskHandlerId;
  public readonly parameters: DeepReadonly<TaskParameters>;
  public readonly timestamp: TaskTimestamp;
  public readonly delay: TaskDelay;
  public readonly priority: TaskPriority;

  protected queue: Queue;
  protected resolveP: (value: T | PromiseLike<T>) => void;
  protected rejectP: (reason?: any) => void;

  protected taskPromise;

  constructor(
    queue: Queue,
    id: TaskId,
    handlerId: TaskHandlerId,
    parameters: TaskParameters,
    timestamp: TaskTimestamp,
    delay: TaskDelay,
    priority: TaskPriority,
  ) {
    let resolveP, rejectP;
    super((resolve, reject) => {
      resolveP = resolve;
      rejectP = reject;
    });
    this.resolveP = resolveP;
    this.rejectP = rejectP;

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

  /**
   * This is called when `await` is used
   */
  public async then<TResult1 = T, TResult2 = never>(
    onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    if (this.lazy) {
      // setup the event handlers
      // but also return a rejection IF the task no longer exists (the rejection would be ErrorTasksTaskMissing)
    }

    // this is the promise now
    // we can say that we only do what is needed
    // we can make this `then` asynchronous
    // do we use the same db
    // or ask the Task to have the same capability?



    return undefined as any;
  }

  // public then<TResult1, TResult2 = never>(
  //   onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
  //   onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  // ): Promise<TResult1, | TResult2> {

  //   // these callbacks
  //   // how are they supposed to be used?
  //   // this is a promise
  //   return undefined as any;

  // }

//     then<TResult1 = T, TResult2 = never>(
//  onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
//  onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null):
// Promise<TResult1 | TResult2>;

  // public catch () {

  // }

  // public finally () {

  // }

}

// const t = new Task();

const p = new Promise<void>((resolve, reject) => {
  resolve();
});

p.then
// p.catch
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
