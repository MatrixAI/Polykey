import { ErrorPolykey, sysexits } from '../errors';

class ErrorTasks<T> extends ErrorPolykey<T> {}

class ErrorTasksRunning<T> extends ErrorTasks<T> {
  static description = 'Tasks is running';
  exitCode = sysexits.USAGE;
}

class ErrorTasksNotRunning<T> extends ErrorTasks<T> {
  static description = 'Tasks is not running';
  exitCode = sysexits.USAGE;
}

class ErrorTasksDestroyed<T> extends ErrorTasks<T> {
  static description = 'Tasks is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorTask<T> extends ErrorTasks<T> {
  static description = 'Task error';
  exitCode = sysexits.USAGE;
}

class ErrorTaskMissing<T> extends ErrorTask<T> {
  static description =
    'Task does not (or never) existed anymore, it may have been fulfilled or cancelled';
  exitCode = sysexits.USAGE;
}

class ErrorTaskHandlerMissing<T> extends ErrorTask<T> {
  static description = 'Task handler is not registered';
  exitCode = sysexits.USAGE;
}

class ErrorTaskRunning<T> extends ErrorTask<T> {
  static description = 'Task is running, it cannot be updated';
  exitCode = sysexits.USAGE;
}

/**
 * This is used as a signal reason
 */
class ErrorTaskTimeOut<T> extends ErrorTask<T> {
  static description = 'Task exhausted deadline';
  exitCode = sysexits.USAGE;
}

/**
 * This is used as a signal reason
 */
class ErrorTaskStop<T> extends ErrorTask<T> {
  static description = 'TaskManager is stopping, task is being cancelled';
  exitCode = sysexits.USAGE;
}

export {
  ErrorTasks,
  ErrorTasksRunning,
  ErrorTasksNotRunning,
  ErrorTasksDestroyed,
  ErrorTask,
  ErrorTaskMissing,
  ErrorTaskHandlerMissing,
  ErrorTaskRunning,
  ErrorTaskTimeOut,
  ErrorTaskStop,
};
