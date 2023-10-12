import { AbstractEvent } from '@matrixai/events';

abstract class EventsClient<T = null> extends AbstractEvent<T> {}

abstract class EventsClientService<T = null> extends EventsClient<T> {}

class EventClientServiceStart extends EventsClientService {}

class EventClientServiceStarted extends EventsClientService {}

class EventClientServiceStop extends EventsClientService {}

class EventClientServiceStopped extends EventsClientService {}

export {
  EventsClient,
  EventsClientService,
  EventClientServiceStart,
  EventClientServiceStarted,
  EventClientServiceStop,
  EventClientServiceStopped,
};
