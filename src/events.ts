import EventsPolykey from './EventsPolykey';

abstract class EventsPolykeyAgent<T> extends EventsPolykey<T> {}

class EventPolykeyAgentStart extends EventsPolykeyAgent<undefined> {}

class EventPolykeyAgentStarted extends EventsPolykeyAgent<undefined> {}

class EventPolykeyAgentStop extends EventsPolykeyAgent<undefined> {}

class EventPolykeyAgentStopped extends EventsPolykeyAgent<undefined> {}

class EventPolykeyAgentDestroy extends EventsPolykeyAgent<undefined> {}

class EventPolykeyAgentDestroyed extends EventsPolykeyAgent<undefined> {}

abstract class EventsPolykeyClient<T> extends EventsPolykey<T> {}

class EventPolykeyClientStart extends EventsPolykeyClient<undefined> {}

class EventPolykeyClientStarted extends EventsPolykeyClient<undefined> {}

class EventPolykeyClientStop extends EventsPolykeyClient<undefined> {}

class EventPolykeyClientStopped extends EventsPolykeyClient<undefined> {}

class EventPolykeyClientDestroy extends EventsPolykeyClient<undefined> {}

class EventPolykeyClientDestroyed extends EventsPolykeyClient<undefined> {}

export {
  EventsPolykeyAgent,
  EventPolykeyAgentStart,
  EventPolykeyAgentStarted,
  EventPolykeyAgentStop,
  EventPolykeyAgentStopped,
  EventPolykeyAgentDestroy,
  EventPolykeyAgentDestroyed,
  EventsPolykeyClient,
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
export * from './rpc/events';
