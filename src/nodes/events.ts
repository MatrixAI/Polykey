import type { QUICStream } from '@matrixai/quic';
import type { ConnectionData } from '../network/types';
import EventsPolykey from '../EventsPolykey';

abstract class EventsNode<T> extends EventsPolykey<T> {}

abstract class EventsNodeConnection<T> extends EventsNode<T> {}

class EventNodeConnectionError extends EventsNodeConnection<Error> {}

class EventNodeConnectionDestroy extends EventsNodeConnection<undefined> {}

class EventNodeConnectionDestroyed extends EventsNodeConnection<undefined> {}

class EventNodeStream extends EventsNode<QUICStream> {}

abstract class EventNodeConnectionManager<
  T = undefined,
> extends EventsNode<T> {}

class EventNodeConnectionManagerStart extends EventNodeConnectionManager {}

class EventNodeConnectionManagerStarted extends EventNodeConnectionManager {}

class EventNodeConnectionManagerStop extends EventNodeConnectionManager {}

class EventNodeConnectionManagerStopped extends EventNodeConnectionManager {}

class EventNodeConnectionManagerConnection extends EventNodeConnectionManager<ConnectionData> {}

class EventNodeConnectionManagerConnectionFailure extends EventNodeConnectionManager<
  Error | EventNodeConnectionError
> {}

abstract class EventsNodeGraph<T> extends EventsPolykey<T> {}

class EventNodeGraphStart extends EventsNodeGraph<undefined> {}

class EventNodeGraphStarted extends EventsNodeGraph<undefined> {}

class EventNodeGraphStop extends EventsNodeGraph<undefined> {}

class EventNodeGraphStopped extends EventsNodeGraph<undefined> {}

class EventNodeGraphDestroy extends EventsNodeGraph<undefined> {}

class EventNodeGraphDestroyed extends EventsNodeGraph<undefined> {}

abstract class EventsNodeManager<T> extends EventsPolykey<T> {}

class EventNodeManagerStart extends EventsNodeManager<undefined> {}

class EventNodeManagerStarted extends EventsNodeManager<undefined> {}

class EventNodeManagerStop extends EventsNodeManager<undefined> {}

class EventNodeManagerStopped extends EventsNodeManager<undefined> {}

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
  EventsNodeGraph,
  EventNodeGraphStart,
  EventNodeGraphStarted,
  EventNodeGraphStop,
  EventNodeGraphStopped,
  EventNodeGraphDestroy,
  EventNodeGraphDestroyed,
  EventsNodeManager,
  EventNodeManagerStart,
  EventNodeManagerStarted,
  EventNodeManagerStop,
  EventNodeManagerStopped,
};
