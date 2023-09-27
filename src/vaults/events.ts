import EventPolykey from '../EventPolykey';

abstract class EventVaults<T> extends EventPolykey<T> {}

abstract class EventVaultInternal<T> extends EventVaults<T> {}

class EventVaultInternalStart extends EventVaultInternal<undefined> {}

class EventVaultInternalStarted extends EventVaultInternal<undefined> {}

class EventVaultInternalStop extends EventVaultInternal<undefined> {}

class EventVaultInternalStopped extends EventVaultInternal<undefined> {}

class EventVaultInternalDestroy extends EventVaultInternal<undefined> {}

class EventVaultInternalDestroyed extends EventVaultInternal<undefined> {}

abstract class EventVaultManager<T> extends EventVaults<T> {}

class EventVaultManagerStart extends EventVaultManager<undefined> {}

class EventVaultManagerStarted extends EventVaultManager<undefined> {}

class EventVaultManagerStop extends EventVaultManager<undefined> {}

class EventVaultManagerStopped extends EventVaultManager<undefined> {}

class EventVaultManagerDestroy extends EventVaultManager<undefined> {}

class EventVaultManagerDestroyed extends EventVaultManager<undefined> {}

export {
  EventVaults,
  EventVaultInternal,
  EventVaultInternalStart,
  EventVaultInternalStarted,
  EventVaultInternalStop,
  EventVaultInternalStopped,
  EventVaultInternalDestroy,
  EventVaultInternalDestroyed,
  EventVaultManager,
  EventVaultManagerStart,
  EventVaultManagerStarted,
  EventVaultManagerStop,
  EventVaultManagerStopped,
  EventVaultManagerDestroy,
  EventVaultManagerDestroyed,
};
