import EventsPolykey from '../EventsPolykey';

abstract class EventsSchema<T> extends EventsPolykey<T> {}

class EventSchemaStart extends EventsSchema<undefined> {}

class EventSchemaStarted extends EventsSchema<undefined> {}

class EventSchemaStop extends EventsSchema<undefined> {}

class EventSchemaStopped extends EventsSchema<undefined> {}

export {
  EventsSchema,
  EventSchemaStart,
  EventSchemaStarted,
  EventSchemaStop,
  EventSchemaStopped,
};
