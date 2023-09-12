import type { CertManagerChangeData } from './types';
import { AbstractEvent } from '@matrixai/events';

abstract class EventsKeys<T = null> extends AbstractEvent<T> {}

abstract class EventsCertManager<T = null> extends EventsKeys<T> {}

class EventsCertManagerStart extends EventsCertManager {}

class EventsCertManagerStarted extends EventsCertManager {}

class EventsCertManagerStop extends EventsCertManager {}

class EventsCertManagerStopped extends EventsCertManager {}

class EventsCertManagerDestroy extends EventsCertManager {}

class EventsCertManagerDestroyed extends EventsCertManager {}

class EventsCertManagerCertChange extends EventsCertManager<CertManagerChangeData> {}

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
};
