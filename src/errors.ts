import ErrorPolykey from './ErrorPolykey';
import sysexits from './utils/sysexits';

class ErrorPolykeyUnimplemented extends ErrorPolykey {
  description = 'This is an unimplemented functionality';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorPolykeyAgentRunning extends ErrorPolykey {}

class ErrorPolykeyAgentNotRunning extends ErrorPolykey {}

class ErrorPolykeyAgentDestroyed extends ErrorPolykey {}

class ErrorPolykeyClientRunning extends ErrorPolykey {}

class ErrorPolykeyClientNotRunning extends ErrorPolykey {}

class ErrorPolykeyClientDestroyed extends ErrorPolykey {}

class ErrorInvalidId extends ErrorPolykey {}

class ErrorInvalidConfigEnvironment extends ErrorPolykey {}

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
export * from './status/errors';
export * from './utils/errors';
