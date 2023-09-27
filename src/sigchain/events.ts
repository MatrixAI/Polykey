import EventsPolykey from '../EventsPolykey';

abstract class EventsSigchain<T> extends EventsPolykey<T> {}

class EventSigchainStart extends EventsSigchain<undefined> {}

class EventSigchainStarted extends EventsSigchain<undefined> {}

class EventSigchainStop extends EventsSigchain<undefined> {}

class EventSigchainStopped extends EventsSigchain<undefined> {}

class EventSigchainDestroy extends EventsSigchain<undefined> {}

class EventSigchainDestroyed extends EventsSigchain<undefined> {}

export {
  EventsSigchain,
  EventSigchainStart,
  EventSigchainStarted,
  EventSigchainStop,
  EventSigchainStopped,
  EventSigchainDestroy,
  EventSigchainDestroyed,
};
