import type { Notification } from './types';
import EventPolykey from '../EventPolykey';

abstract class EventNotificationsManager<T = null> extends EventPolykey<T> {}

class EventNotificationsManagerStart extends EventNotificationsManager {}

class EventNotificationsManagerStarted extends EventNotificationsManager {}

class EventNotificationsManagerStop extends EventNotificationsManager {}

class EventNotificationsManagerStopped extends EventNotificationsManager {}

class EventNotificationsManagerDestroy extends EventNotificationsManager {}

class EventNotificationsManagerDestroyed extends EventNotificationsManager {}

class EventNotificationsManagerNotification extends EventNotificationsManager<Notification> {}

export {
  EventNotificationsManager,
  EventNotificationsManagerStart,
  EventNotificationsManagerStarted,
  EventNotificationsManagerStop,
  EventNotificationsManagerStopped,
  EventNotificationsManagerDestroy,
  EventNotificationsManagerDestroyed,
  EventNotificationsManagerNotification,
};
