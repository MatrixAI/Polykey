import EventPolykey from '../EventPolykey';

abstract class EventDiscovery<T> extends EventPolykey<T> {}

class EventDiscoveryStart extends EventDiscovery<undefined> {}

class EventDiscoveryStarted extends EventDiscovery<undefined> {}

class EventDiscoveryStop extends EventDiscovery<undefined> {}

class EventDiscoveryStopped extends EventDiscovery<undefined> {}

class EventDiscoveryDestroy extends EventDiscovery<undefined> {}

class EventDiscoveryDestroyed extends EventDiscovery<undefined> {}

export {
  EventDiscovery,
  EventDiscoveryStart,
  EventDiscoveryStarted,
  EventDiscoveryStop,
  EventDiscoveryStopped,
  EventDiscoveryDestroy,
  EventDiscoveryDestroyed,
};
