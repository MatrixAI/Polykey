import type { VertexEventIdentifier, VertexEventError } from './types';
import EventPolykey from '../EventPolykey';

abstract class EventDiscovery<T> extends EventPolykey<T> {}

class EventDiscoveryStart extends EventDiscovery<undefined> {}

class EventDiscoveryStarted extends EventDiscovery<undefined> {}

class EventDiscoveryStop extends EventDiscovery<undefined> {}

class EventDiscoveryStopped extends EventDiscovery<undefined> {}

class EventDiscoveryDestroy extends EventDiscovery<undefined> {}

class EventDiscoveryDestroyed extends EventDiscovery<undefined> {}

/**
 * Emitted when a vertex is queued to be processed.
 * Will include details about the vertex and it's parent.
 */
class EventDiscoveryVertexQueued extends EventDiscovery<VertexEventIdentifier> {}

/**
 * Emitted when a vertex has been processed.
 * Will include details about the vertex and it's parent.
 */
class EventDiscoveryVertexProcessed extends EventDiscovery<VertexEventIdentifier> {}

/**
 * Emitted when a vertex failed to process.
 * Includes details about the failure, the vertex and it's parent.
 */
class EventDiscoveryVertexFailed extends EventDiscovery<VertexEventError> {}

/**
 * Emitted when a vertex is removed from consideration for rediscover.
 * This happens when if fails to process for too long.
 * Will include details about the vertex and it's parent.
 */
class EventDiscoveryVertexCulled extends EventDiscovery<VertexEventIdentifier> {}

/**
 * Emitted when a vertex is removed from the queue without being processed.
 * Will include details about the vertex and it's parent.
 */
class EventDiscoveryVertexCancelled extends EventDiscovery<VertexEventIdentifier> {}

class EventDiscoveryCheckRediscovery extends EventDiscovery<undefined> {}

export {
  EventDiscovery,
  EventDiscoveryStart,
  EventDiscoveryStarted,
  EventDiscoveryStop,
  EventDiscoveryStopped,
  EventDiscoveryDestroy,
  EventDiscoveryDestroyed,
  EventDiscoveryVertexQueued,
  EventDiscoveryVertexProcessed,
  EventDiscoveryVertexFailed,
  EventDiscoveryVertexCulled,
  EventDiscoveryVertexCancelled,
  EventDiscoveryCheckRediscovery,
};
