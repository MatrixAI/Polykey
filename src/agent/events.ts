import EventPolykey from '../EventPolykey';

abstract class EventAgent<T> extends EventPolykey<T> {}

abstract class EventAgentService<T> extends EventAgent<T> {}

class EventAgentServiceDestroy<T> extends EventAgent<T> {}

class EventAgentServiceDestroyed<T> extends EventAgent<T> {}

export {
  EventAgent,
  EventAgentService,
  EventAgentServiceDestroy,
  EventAgentServiceDestroyed
};
