import type { QUICStream } from '@matrixai/quic';
import type { ConnectionData } from '../network/types';
import EventPolykey from '../EventPolykey';

abstract class EventNode<T> extends EventPolykey<T> {}

abstract class EventNodeConnection<T> extends EventNode<T> {}

class EventNodeConnectionError extends EventNodeConnection<Error> {}

class EventNodeConnectionDestroy extends EventNodeConnection<undefined> {}

class EventNodeConnectionDestroyed extends EventNodeConnection<undefined> {}

class EventNodeConnectionStream extends EventNode<QUICStream> {}

abstract class EventNodeConnectionManager<
  T = undefined,
> extends EventNode<T> {}

class EventNodeConnectionManagerStart extends EventNodeConnectionManager {}

class EventNodeConnectionManagerStarted extends EventNodeConnectionManager {}

class EventNodeConnectionManagerStop extends EventNodeConnectionManager {}

class EventNodeConnectionManagerStopped extends EventNodeConnectionManager {}

class EventNodeConnectionManagerConnection extends EventNodeConnectionManager<ConnectionData> {}

class EventNodeConnectionManagerConnectionFailure extends EventNodeConnectionManager<
  Error | EventNodeConnectionError
> {}

abstract class EventNodeGraph<T> extends EventPolykey<T> {}

class EventNodeGraphStart extends EventNodeGraph<undefined> {}

class EventNodeGraphStarted extends EventNodeGraph<undefined> {}

class EventNodeGraphStop extends EventNodeGraph<undefined> {}

class EventNodeGraphStopped extends EventNodeGraph<undefined> {}

class EventNodeGraphDestroy extends EventNodeGraph<undefined> {}

class EventNodeGraphDestroyed extends EventNodeGraph<undefined> {}

abstract class EventNodeManager<T> extends EventPolykey<T> {}

class EventNodeManagerStart extends EventNodeManager<undefined> {}

class EventNodeManagerStarted extends EventNodeManager<undefined> {}

class EventNodeManagerStop extends EventNodeManager<undefined> {}

class EventNodeManagerStopped extends EventNodeManager<undefined> {}

export {
  EventNode,
  EventNodeConnection,
  EventNodeConnectionError,
  EventNodeConnectionDestroy,
  EventNodeConnectionDestroyed,
  EventNodeConnectionStream,
  EventNodeConnectionManager,
  EventNodeConnectionManagerStart,
  EventNodeConnectionManagerStarted,
  EventNodeConnectionManagerStop,
  EventNodeConnectionManagerStopped,
  EventNodeConnectionManagerConnection,
  EventNodeConnectionManagerConnectionFailure,
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
