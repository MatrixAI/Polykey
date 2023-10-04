import EventPolykey from '../EventPolykey';

abstract class EventIdentitiesManager<T> extends EventPolykey<T> {}

class EventIdentitiesManagerStart extends EventIdentitiesManager<undefined> {}

class EventIdentitiesManagerStarted extends EventIdentitiesManager<undefined> {}

class EventIdentitiesManagerStop extends EventIdentitiesManager<undefined> {}

class EventIdentitiesManagerStopped extends EventIdentitiesManager<undefined> {}

class EventIdentitiesManagerDestroy extends EventIdentitiesManager<undefined> {}

class EventIdentitiesManagerDestroyed extends EventIdentitiesManager<undefined> {}

export {
  EventIdentitiesManager,
  EventIdentitiesManagerStart,
  EventIdentitiesManagerStarted,
  EventIdentitiesManagerStop,
  EventIdentitiesManagerStopped,
  EventIdentitiesManagerDestroy,
  EventIdentitiesManagerDestroyed,
};
