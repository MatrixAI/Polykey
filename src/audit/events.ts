import EventPolykey from '../EventPolykey';

abstract class EventAudit<T = undefined> extends EventPolykey<T> {}

class EventAuditStart extends EventAudit {}

class EventAuditStarted extends EventAudit {}

class EventAuditStop extends EventAudit {}

class EventAuditStopped extends EventAudit {}

class EventAuditDestroy extends EventAudit {}

class EventAuditDestroyed extends EventAudit {}

export {
  EventAudit,
  EventAuditStart,
  EventAuditStarted,
  EventAuditStop,
  EventAuditStopped,
  EventAuditDestroy,
  EventAuditDestroyed,
};
