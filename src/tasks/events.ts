import EventsPolykey from '../EventsPolykey';

abstract class EventsTasks<T> extends EventsPolykey<T> {}

abstract class EventsTaskManager<T> extends EventsTasks<T> {}

class EventTaskManagerStart extends EventsTaskManager<undefined> {}

class EventTaskManagerStarted extends EventsTaskManager<undefined> {}

class EventTaskManagerStop extends EventsTaskManager<undefined> {}

class EventTaskManagerStopped extends EventsTaskManager<undefined> {}

class EventTaskManagerDestroy extends EventsTaskManager<undefined> {}

class EventTaskManagerDestroyed extends EventsTaskManager<undefined> {}

export {
  EventsTasks,
  EventsTaskManager,
  EventTaskManagerStart,
  EventTaskManagerStarted,
  EventTaskManagerStop,
  EventTaskManagerStopped,
  EventTaskManagerDestroy,
  EventTaskManagerDestroyed,
};
