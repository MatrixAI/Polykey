import type { CertManagerChangeData } from './types';
import EventsPolykey from '../EventsPolykey';

abstract class EventsKeys<T = undefined> extends EventsPolykey<T> {}

abstract class EventsCertManager<T = undefined> extends EventsKeys<T> {}

class EventsCertManagerStart extends EventsCertManager {}

class EventsCertManagerStarted extends EventsCertManager {}

class EventsCertManagerStop extends EventsCertManager {}

class EventsCertManagerStopped extends EventsCertManager {}

class EventsCertManagerDestroy extends EventsCertManager {}

class EventsCertManagerDestroyed extends EventsCertManager {}

class EventsCertManagerCertChange extends EventsCertManager<CertManagerChangeData> {}

abstract class EventsKeyRing<T = undefined> extends EventsKeys<T> {}

class EventsKeyRingStart extends EventsKeyRing {}

class EventsKeyRingStarted extends EventsKeyRing {}

class EventsKeyRingStop extends EventsKeyRing {}

class EventsKeyRingStopped extends EventsKeyRing {}

class EventsKeyRingDestroy extends EventsKeyRing {}

class EventsKeyRingDestroyed extends EventsKeyRing {}

export {
  EventsKeys,
  EventsCertManager,
  EventsCertManagerStart,
  EventsCertManagerStarted,
  EventsCertManagerStop,
  EventsCertManagerStopped,
  EventsCertManagerDestroy,
  EventsCertManagerDestroyed,
  EventsCertManagerCertChange,
  EventsKeyRing,
  EventsKeyRingStart,
  EventsKeyRingStarted,
  EventsKeyRingStop,
  EventsKeyRingStopped,
  EventsKeyRingDestroy,
  EventsKeyRingDestroyed,
};
