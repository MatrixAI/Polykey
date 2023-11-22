import type { TopicPath, TopicSubPathToAuditEvent } from './types';
import EventPolykey from '../EventPolykey';

abstract class EventAudit<T = undefined> extends EventPolykey<T> {}

class EventAuditStart extends EventAudit {}

class EventAuditStarted extends EventAudit {}

class EventAuditStop extends EventAudit {}

class EventAuditStopped extends EventAudit {}

class EventAuditDestroy extends EventAudit {}

class EventAuditDestroyed extends EventAudit {}

abstract class EventAuditAuditEvent<T = null> extends EventAudit<T> {}

class EventAuditAuditEventSet<
  P extends TopicPath = TopicPath,
  T extends TopicSubPathToAuditEvent<P> = TopicSubPathToAuditEvent<P>,
> extends EventAuditAuditEvent<{
  topicPath: P;
  auditEvent: T;
}> {}

export {
  EventAudit,
  EventAuditStart,
  EventAuditStarted,
  EventAuditStop,
  EventAuditStopped,
  EventAuditDestroy,
  EventAuditDestroyed,
  EventAuditAuditEvent,
  EventAuditAuditEventSet,
};
