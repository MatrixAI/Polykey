import { ErrorPolykey, sysexits } from '../errors';

class ErrorTasks<T> extends ErrorPolykey<T> {}

class ErrorScheduler<T> extends ErrorTasks<T> {}

class ErrorSchedulerRunning<T> extends ErrorScheduler<T> {
  static description = 'Scheduler is running';
  exitCode = sysexits.USAGE;
}

class ErrorSchedulerNotRunning<T> extends ErrorScheduler<T> {
  static description = 'Scheduler is not running';
  exitCode = sysexits.USAGE;
}

class ErrorSchedulerDestroyed<T> extends ErrorScheduler<T> {
  static description = 'Scheduler is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorSchedulerHandlerMissing<T> extends ErrorScheduler<T> {
  static description = 'Scheduler task handler is not registered';
  exitCode = sysexits.USAGE;
}

class ErrorQueue<T> extends ErrorTasks<T> {}

class ErrorQueueRunning<T> extends ErrorQueue<T> {
  static description = 'Queue is running';
  exitCode = sysexits.USAGE;
}

class ErrorQueueNotRunning<T> extends ErrorQueue<T> {
  static description = 'Queue is not running';
  exitCode = sysexits.USAGE;
}

class ErrorQueueDestroyed<T> extends ErrorQueue<T> {
  static description = 'Queue is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorTask<T> extends ErrorTasks<T> {
  static description = 'Task error';
  exitCode = sysexits.USAGE;
}

class ErrorTaskRejected<T> extends ErrorTask<T> {
  static description = 'Task handler threw an exception';
  exitCode = sysexits.USAGE;
}

class ErrorTaskCancelled<T> extends ErrorTask<T> {
  static description = 'Task has been cancelled';
  exitCode = sysexits.USAGE;
}

class ErrorTaskMissing<T> extends ErrorTask<T> {
  static description = 'Task does not (or never) existed anymore, it may have been fulfilled or cancelled';
  exitCode = sysexits.USAGE;
}

export {
  ErrorTasks,
  ErrorScheduler,
  ErrorSchedulerRunning,
  ErrorSchedulerNotRunning,
  ErrorSchedulerDestroyed,
  ErrorSchedulerHandlerMissing,
  ErrorQueue,
  ErrorQueueRunning,
  ErrorQueueNotRunning,
  ErrorQueueDestroyed,
  ErrorTask,
  ErrorTaskRejected,
  ErrorTaskCancelled,
  ErrorTaskMissing,
};
