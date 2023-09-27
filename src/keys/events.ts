import type { CertManagerChangeData } from './types';
import EventPolykey from '../EventPolykey';

abstract class EventKeys<T = undefined> extends EventPolykey<T> {}

abstract class EventCertManager<T = undefined> extends EventKeys<T> {}

class EventCertManagerStart extends EventCertManager {}

class EventCertManagerStarted extends EventCertManager {}

class EventCertManagerStop extends EventCertManager {}

class EventCertManagerStopped extends EventCertManager {}

class EventCertManagerDestroy extends EventCertManager {}

class EventCertManagerDestroyed extends EventCertManager {}

class EventCertManagerCertChange extends EventCertManager<CertManagerChangeData> {}

abstract class EventKeyRing<T = undefined> extends EventKeys<T> {}

class EventKeyRingStart extends EventKeyRing {}

class EventKeyRingStarted extends EventKeyRing {}

class EventKeyRingStop extends EventKeyRing {}

class EventKeyRingStopped extends EventKeyRing {}

class EventKeyRingDestroy extends EventKeyRing {}

class EventKeyRingDestroyed extends EventKeyRing {}

export {
  EventKeys,
  EventCertManager,
  EventCertManagerStart,
  EventCertManagerStarted,
  EventCertManagerStop,
  EventCertManagerStopped,
  EventCertManagerDestroy,
  EventCertManagerDestroyed,
  EventCertManagerCertChange,
  EventKeyRing,
  EventKeyRingStart,
  EventKeyRingStarted,
  EventKeyRingStop,
  EventKeyRingStopped,
  EventKeyRingDestroy,
  EventKeyRingDestroyed,
};
