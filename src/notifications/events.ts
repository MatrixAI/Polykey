import EventPolykey from '../EventPolykey';

abstract class EventNotificationsManager<T> extends EventPolykey<T> {}

class EventNotificationsManagerStart extends EventNotificationsManager<undefined> {}

class EventNotificationsManagerStarted extends EventNotificationsManager<undefined> {}

class EventNotificationsManagerStop extends EventNotificationsManager<undefined> {}

class EventNotificationsManagerStopped extends EventNotificationsManager<undefined> {}

class EventNotificationsManagerDestroy extends EventNotificationsManager<undefined> {}

class EventNotificationsManagerDestroyed extends EventNotificationsManager<undefined> {}

export {
  EventNotificationsManager,
  EventNotificationsManagerStart,
  EventNotificationsManagerStarted,
  EventNotificationsManagerStop,
  EventNotificationsManagerStopped,
  EventNotificationsManagerDestroy,
  EventNotificationsManagerDestroyed,
};
