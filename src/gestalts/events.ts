import EventPolykey from '../EventPolykey';

abstract class EventGestalts<T> extends EventPolykey<T> {}

class EventGestaltsStart extends EventGestalts<undefined> {}

class EventGestaltsStarted extends EventGestalts<undefined> {}

class EventGestaltsStop extends EventGestalts<undefined> {}

class EventGestaltsStopped extends EventGestalts<undefined> {}

class EventGestaltsDestroy extends EventGestalts<undefined> {}

class EventGestaltsDestroyed extends EventGestalts<undefined> {}

export {
  EventGestalts,
  EventGestaltsStart,
  EventGestaltsStarted,
  EventGestaltsStop,
  EventGestaltsStopped,
  EventGestaltsDestroy,
  EventGestaltsDestroyed,
};
