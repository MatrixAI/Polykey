import EventPolykey from './EventPolykey.js';

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
export * from './acl/events.js';
export * from './discovery/events.js';
export * from './sessions/events.js';
export * from './keys/events.js';
export * from './vaults/events.js';
export * from './gestalts/events.js';
export * from './identities/events.js';
export * from './nodes/events.js';
export * from './sigchain/events.js';
export * from './notifications/events.js';
export * from './schema/events.js';
export * from './status/events.js';
export * from './tasks/events.js';
