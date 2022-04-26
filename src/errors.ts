import ErrorPolykey from './ErrorPolykey';
import sysexits from './utils/sysexits';

class ErrorPolykeyUnimplemented<T> extends ErrorPolykey<T> {
  static description = 'This is an unimplemented functionality';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorPolykeyAgentRunning<T> extends ErrorPolykey<T> {
  static description = 'PolykeyAgent is running';
  exitCode = sysexits.USAGE;
}

class ErrorPolykeyAgentNotRunning<T> extends ErrorPolykey<T> {
  static description = 'PolykeyAgent is not running';
  exitCode = sysexits.USAGE;
}

class ErrorPolykeyAgentDestroyed<T> extends ErrorPolykey<T> {
  static description = 'PolykeyAgent is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorPolykeyClientRunning<T> extends ErrorPolykey<T> {
  static description = 'PolykeyClient is running';
  exitCode = sysexits.USAGE;
}

class ErrorPolykeyClientNotRunning<T> extends ErrorPolykey<T> {
  static description = 'PolykeyClient is not running';
  exitCode = sysexits.USAGE;
}

class ErrorPolykeyClientDestroyed<T> extends ErrorPolykey<T> {
  static description = 'PolykeyClient is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorInvalidId<T> extends ErrorPolykey<T> {}

class ErrorInvalidConfigEnvironment<T> extends ErrorPolykey<T> {}

export {
  sysexits,
  ErrorPolykey,
  ErrorPolykeyUnimplemented,
  ErrorPolykeyAgentRunning,
  ErrorPolykeyAgentNotRunning,
  ErrorPolykeyAgentDestroyed,
  ErrorPolykeyClientRunning,
  ErrorPolykeyClientNotRunning,
  ErrorPolykeyClientDestroyed,
  ErrorInvalidId,
  ErrorInvalidConfigEnvironment,
};

/**
 * Recursively export all domain-level error classes
 * This ensures that we have one place to construct and
 * reference all Polykey errors.
 * This is used by gRPC to serialize errors from agent to client.
 */
export * from './acl/errors';
export * from './sessions/errors';
export * from './keys/errors';
export * from './vaults/errors';
export * from './git/errors';
export * from './gestalts/errors';
export * from './identities/errors';
export * from './agent/errors';
export * from './client/errors';
export * from './grpc/errors';
export * from './network/errors';
export * from './nodes/errors';
export * from './claims/errors';
export * from './sigchain/errors';
export * from './bootstrap/errors';
export * from './notifications/errors';
export * from './schema/errors';
export * from './status/errors';
export * from './validation/errors';
export * from './utils/errors';
