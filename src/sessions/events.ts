import EventsPolykey from '../EventsPolykey';

abstract class EventsSessions<T> extends EventsPolykey<T> {}

abstract class EventsSession<T> extends EventsSessions<T> {}

class EventSessionStart extends EventsSession<undefined> {}

class EventSessionStarted extends EventsSession<undefined> {}

class EventSessionStop extends EventsSession<undefined> {}

class EventSessionStopped extends EventsSession<undefined> {}

class EventSessionDestroy extends EventsSession<undefined> {}

class EventSessionDestroyed extends EventsSession<undefined> {}

abstract class EventsSessionManager<T> extends EventsSessions<T> {}

class EventSessionManagerStart extends EventsSessionManager<undefined> {}

class EventSessionManagerStarted extends EventsSessionManager<undefined> {}

class EventSessionManagerStop extends EventsSessionManager<undefined> {}

class EventSessionManagerStopped extends EventsSessionManager<undefined> {}

class EventSessionManagerDestroy extends EventsSessionManager<undefined> {}

class EventSessionManagerDestroyed extends EventsSessionManager<undefined> {}

export {
  EventsSessions,
  EventsSession,
  EventSessionStart,
  EventSessionStarted,
  EventSessionStop,
  EventSessionStopped,
  EventSessionDestroy,
  EventSessionDestroyed,
  EventsSessionManager,
  EventSessionManagerStart,
  EventSessionManagerStarted,
  EventSessionManagerStop,
  EventSessionManagerStopped,
  EventSessionManagerDestroy,
  EventSessionManagerDestroyed,
};
