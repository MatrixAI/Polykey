import EventPolykey from '../EventPolykey';

abstract class EventStatus<T> extends EventPolykey<T> {}

class EventStatusStart extends EventStatus<undefined> {}

class EventStatusStarted extends EventStatus<undefined> {}

class EventStatusStop extends EventStatus<undefined> {}

class EventStatusStopped extends EventStatus<undefined> {}

export {
  EventStatus,
  EventStatusStart,
  EventStatusStarted,
  EventStatusStop,
  EventStatusStopped,
};
