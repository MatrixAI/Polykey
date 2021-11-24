import ErrorPolykey from './ErrorPolykey';

/**
 * This is a special error that is only used for absurd situations
 * Intended to placate typescript so that unreachable code type checks
 * If this is thrown, this means there is a bug in the code
 */
class ErrorPolykeyUndefinedBehaviour extends ErrorPolykey {
  description = 'You should never see this error';
  exitCode = 70;
}

class ErrorPolykeyAgentRunning extends ErrorPolykey {}

class ErrorPolykeyAgentNotRunning extends ErrorPolykey {}

class ErrorPolykeyAgentDestroyed extends ErrorPolykey {}

class ErrorPolykeyClientRunning extends ErrorPolykey {}

class ErrorPolykeyClientNotRunning extends ErrorPolykey {}

class ErrorPolykeyClientDestroyed extends ErrorPolykey {}

class ErrorInvalidId extends ErrorPolykey {}

export {
  ErrorPolykey,
  ErrorPolykeyUndefinedBehaviour,
  ErrorPolykeyAgentRunning,
  ErrorPolykeyAgentNotRunning,
  ErrorPolykeyAgentDestroyed,
  ErrorPolykeyClientRunning,
  ErrorPolykeyClientNotRunning,
  ErrorPolykeyClientDestroyed,
  ErrorInvalidId,
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
