import { ErrorPolykey, sysexits } from '../errors';

class ErrorTasks<T> extends ErrorPolykey<T> {}

class ErrorTaskManagerRunning<T> extends ErrorTasks<T> {
  static description = 'TaskManager is running';
  exitCode = sysexits.USAGE;
}

class ErrorTaskManagerNotRunning<T> extends ErrorTasks<T> {
  static description = 'TaskManager is not running';
  exitCode = sysexits.USAGE;
}

class ErrorTaskManagerDestroyed<T> extends ErrorTasks<T> {
  static description = 'TaskManager is destroyed';
  exitCode = sysexits.USAGE;
}

/**
 * This is an unrecoverable error
 */
class ErrorTaskManagerScheduler<T> extends ErrorTasks<T> {
  static description =
    'TaskManager scheduling loop encountered an unrecoverable error';
  exitCode = sysexits.SOFTWARE;
}

/**
 * This is an unrecoverable error
 */
class ErrorTaskManagerQueue<T> extends ErrorTasks<T> {
  static description =
    'TaskManager queuing loop encountered an unrecoverable error';
  exitCode = sysexits.SOFTWARE;
}

class ErrorTask<T> extends ErrorTasks<T> {
  static description = 'Task error';
  exitCode = sysexits.USAGE;
}

class ErrorTaskMissing<T> extends ErrorTask<T> {
  static description =
    'Task does not (or never) existed anymore, it may have been fulfilled or cancelled';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorTaskHandlerMissing<T> extends ErrorTask<T> {
  static description = 'Task handler is not registered';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorTaskRunning<T> extends ErrorTask<T> {
  static description = 'Task is running, it cannot be updated';
  exitCode = sysexits.USAGE;
}

/**
 * This is used as a signal reason when the `TaskDeadline` is reached
 */
class ErrorTaskTimeOut<T> extends ErrorTask<T> {
  static description = 'Task exhausted deadline';
  exitCode = sysexits.UNAVAILABLE;
}

/**
 * This is used as a signal reason when calling `TaskManager.stopTasks()`
 * If the task should be retried, then the task handler should throw `ErrorTaskRetry`
 */
class ErrorTaskStop<T> extends ErrorTask<T> {
  static description = 'TaskManager is stopping, task is being cancelled';
  exitCode = sysexits.OK;
}

/**
 * If this is thrown by the task, the task will be requeued so it can be
 * retried, if the task rejects or resolves in any other way, the task
 * will be considered to have completed
 */
class ErrorTaskRetry<T> extends ErrorTask<T> {
  static description = 'Task should be retried';
  exitCode = sysexits.TEMPFAIL;
}

/**
 * This error indicates a bug
 */
class ErrorTaskRequeue<T> extends ErrorTask<T> {
  static description = 'Task could not be requeued';
  exitCode = sysexits.SOFTWARE;
}

/**
 * This error indicates a bug
 */
class ErrorTaskGarbageCollection<T> extends ErrorTask<T> {
  static description = 'Task could not be garbage collected';
  exitCode = sysexits.SOFTWARE;
}

export {
  ErrorTasks,
  ErrorTaskManagerRunning,
  ErrorTaskManagerNotRunning,
  ErrorTaskManagerDestroyed,
  ErrorTaskManagerScheduler,
  ErrorTaskManagerQueue,
  ErrorTask,
  ErrorTaskMissing,
  ErrorTaskHandlerMissing,
  ErrorTaskRunning,
  ErrorTaskTimeOut,
  ErrorTaskStop,
  ErrorTaskRetry,
  ErrorTaskRequeue,
  ErrorTaskGarbageCollection,
};
