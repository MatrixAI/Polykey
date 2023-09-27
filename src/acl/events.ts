import EventsPolykey from '../EventsPolykey';

abstract class EventsACL<T> extends EventsPolykey<T> {}

class EventACLStart extends EventsACL<undefined> {}

class EventACLStarted extends EventsACL<undefined> {}

class EventACLStop extends EventsACL<undefined> {}

class EventACLStopped extends EventsACL<undefined> {}

class EventACLDestroy extends EventsACL<undefined> {}

class EventACLDestroyed extends EventsACL<undefined> {}

export {
  EventsACL,
  EventACLStart,
  EventACLStarted,
  EventACLStop,
  EventACLStopped,
  EventACLDestroy,
  EventACLDestroyed,
};
