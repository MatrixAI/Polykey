import EventPolykey from '../EventPolykey';

abstract class EventSessions<T> extends EventPolykey<T> {}

abstract class EventSession<T> extends EventSessions<T> {}

class EventSessionStart extends EventSession<undefined> {}

class EventSessionStarted extends EventSession<undefined> {}

class EventSessionStop extends EventSession<undefined> {}

class EventSessionStopped extends EventSession<undefined> {}

class EventSessionDestroy extends EventSession<undefined> {}

class EventSessionDestroyed extends EventSession<undefined> {}

abstract class EventSessionManager<T> extends EventSessions<T> {}

class EventSessionManagerStart extends EventSessionManager<undefined> {}

class EventSessionManagerStarted extends EventSessionManager<undefined> {}

class EventSessionManagerStop extends EventSessionManager<undefined> {}

class EventSessionManagerStopped extends EventSessionManager<undefined> {}

class EventSessionManagerDestroy extends EventSessionManager<undefined> {}

class EventSessionManagerDestroyed extends EventSessionManager<undefined> {}

export {
  EventSessions,
  EventSession,
  EventSessionStart,
  EventSessionStarted,
  EventSessionStop,
  EventSessionStopped,
  EventSessionDestroy,
  EventSessionDestroyed,
  EventSessionManager,
  EventSessionManagerStart,
  EventSessionManagerStarted,
  EventSessionManagerStop,
  EventSessionManagerStopped,
  EventSessionManagerDestroy,
  EventSessionManagerDestroyed,
};
