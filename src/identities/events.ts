import EventsPolykey from '../EventsPolykey';

abstract class EventsIdentitiesManager<T> extends EventsPolykey<T> {}

class EventIdentitiesManagerStart extends EventsIdentitiesManager<undefined> {}

class EventIdentitiesManagerStarted extends EventsIdentitiesManager<undefined> {}

class EventIdentitiesManagerStop extends EventsIdentitiesManager<undefined> {}

class EventIdentitiesManagerStopped extends EventsIdentitiesManager<undefined> {}

class EventIdentitiesManagerDestroy extends EventsIdentitiesManager<undefined> {}

class EventIdentitiesManagerDestroyed extends EventsIdentitiesManager<undefined> {}

export {
  EventsIdentitiesManager,
  EventIdentitiesManagerStart,
  EventIdentitiesManagerStarted,
  EventIdentitiesManagerStop,
  EventIdentitiesManagerStopped,
  EventIdentitiesManagerDestroy,
  EventIdentitiesManagerDestroyed,
};
