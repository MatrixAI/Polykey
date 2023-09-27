import EventsPolykey from '../EventsPolykey';

abstract class EventsStatus<T> extends EventsPolykey<T> {}

class EventStatusStart extends EventsStatus<undefined> {}

class EventStatusStarted extends EventsStatus<undefined> {}

class EventStatusStop extends EventsStatus<undefined> {}

class EventStatusStopped extends EventsStatus<undefined> {}

export {
  EventsStatus,
  EventStatusStart,
  EventStatusStarted,
  EventStatusStop,
  EventStatusStopped,
};
