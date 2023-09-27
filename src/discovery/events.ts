import EventsPolykey from '../EventsPolykey';

abstract class EventsDiscovery<T> extends EventsPolykey<T> {}

class EventDiscoveryStart extends EventsDiscovery<undefined> {}

class EventDiscoveryStarted extends EventsDiscovery<undefined> {}

class EventDiscoveryStop extends EventsDiscovery<undefined> {}

class EventDiscoveryStopped extends EventsDiscovery<undefined> {}

class EventDiscoveryDestroy extends EventsDiscovery<undefined> {}

class EventDiscoveryDestroyed extends EventsDiscovery<undefined> {}

export {
  EventsDiscovery,
  EventDiscoveryStart,
  EventDiscoveryStarted,
  EventDiscoveryStop,
  EventDiscoveryStopped,
  EventDiscoveryDestroy,
  EventDiscoveryDestroyed,
};
