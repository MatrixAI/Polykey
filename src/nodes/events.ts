import type { QUICStream } from '@matrixai/quic';
import type { ConnectionData } from '@/network/types';

type OptDetail<T> = T extends undefined ? {} : { detail: T };

// FIXME
/**
 * Used as scaffold for the clone functionality.
 * Must use the events lib implementation when available.
 */
class TempBaseEvent<T = undefined> extends Event {
  public readonly detail: T;
  constructor(type: string, protected options?: EventInit & OptDetail<T>) {
    super(type, options);
    // @ts-ignore: Detail should be undefined here if it doesn't exist
    this.detail = options?.detail;
  }

  public clone(): this {
    // @ts-ignore: cheeky self prototype reference
    return new this.constructor(this.options);
  }
}

abstract class EventsNode<T = undefined> extends TempBaseEvent<T> {}
abstract class EventsNodeConnection<T = undefined> extends EventsNode<T> {}

class EventNodeConnectionDestroy extends EventsNodeConnection {
  constructor(options?: EventInit) {
    super(EventNodeConnectionDestroy.name, options);
  }
}

class EventNodeStream extends EventsNode<QUICStream> {
  constructor(options?: EventInit & { detail: QUICStream }) {
    super(EventNodeStream.name, options);
  }
}

abstract class EventNodeConnectionManager<
  T = undefined,
> extends EventsNode<T> {}

class EventNodeConnectionManagerConnection extends EventNodeConnectionManager<ConnectionData> {
  constructor(options?: EventInit & { detail: ConnectionData }) {
    super(EventNodeConnectionManagerConnection.name, options);
  }
}

export {
  EventNodeConnectionDestroy,
  EventNodeStream,
  EventNodeConnectionManagerConnection,
};
