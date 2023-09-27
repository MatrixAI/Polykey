import EventPolykey from '../EventPolykey';

abstract class EventSigchain<T> extends EventPolykey<T> {}

class EventSigchainStart extends EventSigchain<undefined> {}

class EventSigchainStarted extends EventSigchain<undefined> {}

class EventSigchainStop extends EventSigchain<undefined> {}

class EventSigchainStopped extends EventSigchain<undefined> {}

class EventSigchainDestroy extends EventSigchain<undefined> {}

class EventSigchainDestroyed extends EventSigchain<undefined> {}

export {
  EventSigchain,
  EventSigchainStart,
  EventSigchainStarted,
  EventSigchainStop,
  EventSigchainStopped,
  EventSigchainDestroy,
  EventSigchainDestroyed,
};
