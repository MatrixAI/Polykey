import EventPolykey from '../EventPolykey';

abstract class EventACL<T = undefined> extends EventPolykey<T> {}

class EventACLStart extends EventACL {}

class EventACLStarted extends EventACL {}

class EventACLStop extends EventACL {}

class EventACLStopped extends EventACL {}

class EventACLDestroy extends EventACL {}

class EventACLDestroyed extends EventACL {}

export {
  EventACL,
  EventACLStart,
  EventACLStarted,
  EventACLStop,
  EventACLStopped,
  EventACLDestroy,
  EventACLDestroyed,
};
