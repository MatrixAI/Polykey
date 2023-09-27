import EventsPolykey from '../EventsPolykey';

abstract class EventsNotificationsManager<T> extends EventsPolykey<T> {}

class EventNotificationsManagerStart extends EventsNotificationsManager<undefined> {}

class EventNotificationsManagerStarted extends EventsNotificationsManager<undefined> {}

class EventNotificationsManagerStop extends EventsNotificationsManager<undefined> {}

class EventNotificationsManagerStopped extends EventsNotificationsManager<undefined> {}

class EventNotificationsManagerDestroy extends EventsNotificationsManager<undefined> {}

class EventNotificationsManagerDestroyed extends EventsNotificationsManager<undefined> {}

export {
  EventsNotificationsManager,
  EventNotificationsManagerStart,
  EventNotificationsManagerStarted,
  EventNotificationsManagerStop,
  EventNotificationsManagerStopped,
  EventNotificationsManagerDestroy,
  EventNotificationsManagerDestroyed,
};
