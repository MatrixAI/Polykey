import type { TaskIdEncoded } from './types';

class TaskEvent<T = any> extends Event {
  public detail:
    | {
        status: 'success';
        result: T;
      }
    | {
        status: 'failure';
        reason: any;
      };

  constructor(
    type: TaskIdEncoded,
    options: EventInit & {
      detail:
        | {
            status: 'success';
            result: T;
          }
        | {
            status: 'failure';
            reason: any;
          };
    },
  ) {
    super(type, options);
    this.detail = options.detail;
  }
}

export default TaskEvent;
