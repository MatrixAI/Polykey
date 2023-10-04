import { AbstractEvent } from '@matrixai/events';

class RPCErrorEvent extends Event {
  public detail: Error;
  constructor(
    options: EventInit & {
      detail: Error;
    },
  ) {
    super('error', options);
    this.detail = options.detail;
  }
}

class EventRPCServerDestroyed extends AbstractEvent<undefined> {}

export { RPCErrorEvent, EventRPCServerDestroyed };
