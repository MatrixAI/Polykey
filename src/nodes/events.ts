import type { QUICStream } from '@matrixai/quic';
import type { ConnectionData } from '../network/types';
import EventPolykey from '../EventPolykey';

abstract class EventNode<T> extends EventPolykey<T> {}

abstract class EventNodeConnection<T = undefined> extends EventNode<T> {}

class EventNodeConnectionError extends EventNodeConnection<Error> {}

class EventNodeConnectionClose extends EventNodeConnection {}

class EventNodeConnectionDestroy extends EventNodeConnection {}

class EventNodeConnectionDestroyed extends EventNodeConnection {}

class EventNodeConnectionStream extends EventNode<QUICStream> {}

abstract class EventNodeConnectionManager<T = undefined> extends EventNode<T> {}

class EventNodeConnectionManagerStart extends EventNodeConnectionManager {}

class EventNodeConnectionManagerStarted extends EventNodeConnectionManager {}

class EventNodeConnectionManagerStop extends EventNodeConnectionManager {}

class EventNodeConnectionManagerStopped extends EventNodeConnectionManager {}

class EventNodeConnectionManagerError extends EventNodeConnectionManager<Error> {}

class EventNodeConnectionManagerClose extends EventNodeConnectionManager {}

class EventNodeConnectionManagerConnection extends EventNodeConnectionManager<ConnectionData> {}

class EventNodeConnectionManagerConnectionForward extends EventNodeConnectionManagerConnection {}

class EventNodeConnectionManagerConnectionReverse extends EventNodeConnectionManagerConnection {}

class EventNodeConnectionManagerConnectionReverseFailure extends EventNodeConnectionManager<
  Error | EventNodeConnectionError
> {}

abstract class EventNodeGraph<T> extends EventPolykey<T> {}

class EventNodeGraphStart extends EventNodeGraph<undefined> {}

class EventNodeGraphStarted extends EventNodeGraph<undefined> {}

class EventNodeGraphStop extends EventNodeGraph<undefined> {}

class EventNodeGraphStopped extends EventNodeGraph<undefined> {}

class EventNodeGraphDestroy extends EventNodeGraph<undefined> {}

class EventNodeGraphDestroyed extends EventNodeGraph<undefined> {}

abstract class EventNodeManager<T = undefined> extends EventPolykey<T> {}

class EventNodeManagerStart extends EventNodeManager {}

class EventNodeManagerStarted extends EventNodeManager {}

class EventNodeManagerStop extends EventNodeManager {}

class EventNodeManagerStopped extends EventNodeManager {}

export {
  EventNode,
  EventNodeConnection,
  EventNodeConnectionError,
  EventNodeConnectionClose,
  EventNodeConnectionDestroy,
  EventNodeConnectionDestroyed,
  EventNodeConnectionStream,
  EventNodeConnectionManager,
  EventNodeConnectionManagerStart,
  EventNodeConnectionManagerStarted,
  EventNodeConnectionManagerStop,
  EventNodeConnectionManagerStopped,
  EventNodeConnectionManagerError,
  EventNodeConnectionManagerClose,
  EventNodeConnectionManagerConnection,
  EventNodeConnectionManagerConnectionForward,
  EventNodeConnectionManagerConnectionReverse,
  EventNodeConnectionManagerConnectionReverseFailure,
  EventNodeGraph,
  EventNodeGraphStart,
  EventNodeGraphStarted,
  EventNodeGraphStop,
  EventNodeGraphStopped,
  EventNodeGraphDestroy,
  EventNodeGraphDestroyed,
  EventNodeManager,
  EventNodeManagerStart,
  EventNodeManagerStarted,
  EventNodeManagerStop,
  EventNodeManagerStopped,
};
