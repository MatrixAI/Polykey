import EventsPolykey from '../EventsPolykey';

abstract class EventsVaults<T> extends EventsPolykey<T> {}

abstract class EventsVaultInternal<T> extends EventsVaults<T> {}

class EventVaultInternalStart extends EventsVaultInternal<undefined> {}

class EventVaultInternalStarted extends EventsVaultInternal<undefined> {}

class EventVaultInternalStop extends EventsVaultInternal<undefined> {}

class EventVaultInternalStopped extends EventsVaultInternal<undefined> {}

class EventVaultInternalDestroy extends EventsVaultInternal<undefined> {}

class EventVaultInternalDestroyed extends EventsVaultInternal<undefined> {}

abstract class EventsVaultManager<T> extends EventsVaults<T> {}

class EventVaultManagerStart extends EventsVaultManager<undefined> {}

class EventVaultManagerStarted extends EventsVaultManager<undefined> {}

class EventVaultManagerStop extends EventsVaultManager<undefined> {}

class EventVaultManagerStopped extends EventsVaultManager<undefined> {}

class EventVaultManagerDestroy extends EventsVaultManager<undefined> {}

class EventVaultManagerDestroyed extends EventsVaultManager<undefined> {}

export {
  EventsVaults,
  EventsVaultInternal,
  EventVaultInternalStart,
  EventVaultInternalStarted,
  EventVaultInternalStop,
  EventVaultInternalStopped,
  EventVaultInternalDestroy,
  EventVaultInternalDestroyed,
  EventsVaultManager,
  EventVaultManagerStart,
  EventVaultManagerStarted,
  EventVaultManagerStop,
  EventVaultManagerStopped,
  EventVaultManagerDestroy,
  EventVaultManagerDestroyed,
};
