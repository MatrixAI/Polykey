import EventPolykey from './EventPolykey';

abstract class EventPolykeyAgent<T> extends EventPolykey<T> {}

class EventPolykeyAgentStart extends EventPolykeyAgent<undefined> {}

class EventPolykeyAgentStarted extends EventPolykeyAgent<undefined> {}

class EventPolykeyAgentStop extends EventPolykeyAgent<undefined> {}

class EventPolykeyAgentStopped extends EventPolykeyAgent<undefined> {}

class EventPolykeyAgentDestroy extends EventPolykeyAgent<undefined> {}

class EventPolykeyAgentDestroyed extends EventPolykeyAgent<undefined> {}

abstract class EventPolykeyClient<T> extends EventPolykey<T> {}

class EventPolykeyClientStart extends EventPolykeyClient<undefined> {}

class EventPolykeyClientStarted extends EventPolykeyClient<undefined> {}

class EventPolykeyClientStop extends EventPolykeyClient<undefined> {}

class EventPolykeyClientStopped extends EventPolykeyClient<undefined> {}

class EventPolykeyClientDestroy extends EventPolykeyClient<undefined> {}

class EventPolykeyClientDestroyed extends EventPolykeyClient<undefined> {}

export {
  EventPolykeyAgent,
  EventPolykeyAgentStart,
  EventPolykeyAgentStarted,
  EventPolykeyAgentStop,
  EventPolykeyAgentStopped,
  EventPolykeyAgentDestroy,
  EventPolykeyAgentDestroyed,
  EventPolykeyClient,
  EventPolykeyClientStart,
  EventPolykeyClientStarted,
  EventPolykeyClientStop,
  EventPolykeyClientStopped,
  EventPolykeyClientDestroy,
  EventPolykeyClientDestroyed,
};

/**
 * Recursively export all domain-level events classes
 * This ensures that we have one place to construct and
 * reference all Polykey events.
 */
export * from './acl/events';
export * from './discovery/events';
export * from './sessions/events';
export * from './keys/events';
export * from './vaults/events';
export * from './gestalts/events';
export * from './identities/events';
export * from './nodes/events';
export * from './sigchain/events';
export * from './notifications/events';
export * from './schema/events';
export * from './status/events';
export * from './tasks/events';
