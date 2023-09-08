import type { QUICStream, events as quicEvents } from '@matrixai/quic';
import type { ConnectionData } from '../network/types';
import { AbstractEvent } from '@matrixai/events';

abstract class EventsNode<T> extends AbstractEvent<T> {}
abstract class EventsNodeConnection<T> extends EventsNode<T> {}

class EventNodeConnectionError extends EventsNodeConnection<
  Error | quicEvents.QUICConnectionErrorEvent
> {}

class EventNodeConnectionDestroy extends EventsNodeConnection<null> {}

class EventNodeConnectionDestroyed extends EventsNodeConnection<null> {}

class EventNodeStream extends EventsNode<QUICStream> {}

abstract class EventNodeConnectionManager<T = null> extends EventsNode<T> {}

class EventNodeConnectionManagerStart extends EventNodeConnectionManager {}

class EventNodeConnectionManagerStarted extends EventNodeConnectionManager {}

class EventNodeConnectionManagerStop extends EventNodeConnectionManager {}

class EventNodeConnectionManagerStopped extends EventNodeConnectionManager {}

class EventNodeConnectionManagerConnection extends EventNodeConnectionManager<ConnectionData> {}

class EventNodeConnectionManagerConnectionFailure extends EventNodeConnectionManager<
  Error | EventNodeConnectionError
> {}

export {
  EventsNode,
  EventsNodeConnection,
  EventNodeConnectionError,
  EventNodeConnectionDestroy,
  EventNodeConnectionDestroyed,
  EventNodeStream,
  EventNodeConnectionManager,
  EventNodeConnectionManagerStart,
  EventNodeConnectionManagerStarted,
  EventNodeConnectionManagerStop,
  EventNodeConnectionManagerStopped,
  EventNodeConnectionManagerConnection,
  EventNodeConnectionManagerConnectionFailure,
};
