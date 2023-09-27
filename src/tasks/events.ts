import EventPolykey from '../EventPolykey';

abstract class EventTasks<T> extends EventPolykey<T> {}

abstract class EventTaskManager<T> extends EventTasks<T> {}

class EventTaskManagerStart extends EventTaskManager<undefined> {}

class EventTaskManagerStarted extends EventTaskManager<undefined> {}

class EventTaskManagerStop extends EventTaskManager<undefined> {}

class EventTaskManagerStopped extends EventTaskManager<undefined> {}

class EventTaskManagerDestroy extends EventTaskManager<undefined> {}

class EventTaskManagerDestroyed extends EventTaskManager<undefined> {}

export {
  EventTasks,
  EventTaskManager,
  EventTaskManagerStart,
  EventTaskManagerStarted,
  EventTaskManagerStop,
  EventTaskManagerStopped,
  EventTaskManagerDestroy,
  EventTaskManagerDestroyed,
};
