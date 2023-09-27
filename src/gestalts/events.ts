import EventsPolykey from '../EventsPolykey';

abstract class EventsGestalts<T> extends EventsPolykey<T> {}

class EventGestaltsStart extends EventsGestalts<undefined> {}

class EventGestaltsStarted extends EventsGestalts<undefined> {}

class EventGestaltsStop extends EventsGestalts<undefined> {}

class EventGestaltsStopped extends EventsGestalts<undefined> {}

class EventGestaltsDestroy extends EventsGestalts<undefined> {}

class EventGestaltsDestroyed extends EventsGestalts<undefined> {}

export {
  EventsGestalts,
  EventGestaltsStart,
  EventGestaltsStarted,
  EventGestaltsStop,
  EventGestaltsStopped,
  EventGestaltsDestroy,
  EventGestaltsDestroyed,
};
