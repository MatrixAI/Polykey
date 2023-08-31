import type { QUICStream } from '@matrixai/quic';
import type { ConnectionData } from '@/network/types';
import { AbstractEvent } from '@matrixai/events';

abstract class EventsNode<T> extends AbstractEvent<T> {}
abstract class EventsNodeConnection<T> extends EventsNode<T> {}

class EventNodeConnectionDestroy extends EventsNodeConnection<null> {}

class EventNodeStream extends EventsNode<QUICStream> {}

abstract class EventNodeConnectionManager<T> extends EventsNode<T> {}

class EventNodeConnectionManagerConnection extends EventNodeConnectionManager<ConnectionData> {}

export {
  EventNodeConnectionDestroy,
  EventNodeStream,
  EventNodeConnectionManagerConnection,
};
