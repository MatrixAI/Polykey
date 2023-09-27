import EventPolykey from '../EventPolykey';

abstract class EventSchema<T> extends EventPolykey<T> {}

class EventSchemaStart extends EventSchema<undefined> {}

class EventSchemaStarted extends EventSchema<undefined> {}

class EventSchemaStop extends EventSchema<undefined> {}

class EventSchemaStopped extends EventSchema<undefined> {}

export {
  EventSchema,
  EventSchemaStart,
  EventSchemaStarted,
  EventSchemaStop,
  EventSchemaStopped,
};
