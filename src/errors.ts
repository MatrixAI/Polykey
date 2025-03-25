import ErrorPolykey from './ErrorPolykey.js';
import sysexits from './utils/sysexits.js';

class ErrorPolykeyUnimplemented<T> extends ErrorPolykey<T> {
  static description = 'This is an unimplemented functionality';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorPolykeyUnknown<T> extends ErrorPolykey<T> {
  static description = 'Unable to deserialise to known error';
  exitCode = sysexits.PROTOCOL;
}

class ErrorPolykeyUnexpected<T> extends ErrorPolykey<T> {
  static description = 'An error originating outside Polykey was thrown';
  exitCode = sysexits.UNKNOWN;
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

class ErrorPolykeyClientCreateTimeout<T> extends ErrorPolykey<T> {
  static description = 'PolykeyClient create timeout';
  exitCode = sysexits.UNAVAILABLE;
}

class ErrorPolykeyClientNodeIdInvalid<T> extends ErrorPolykey<T> {
  static description = 'PolykeyClient failed parsing encoded node ID';
  exitCode = sysexits.USAGE;
}

export {
  sysexits,
  ErrorPolykey,
  ErrorPolykeyUnimplemented,
  ErrorPolykeyUnknown,
  ErrorPolykeyUnexpected,
  ErrorPolykeyAgentRunning,
  ErrorPolykeyAgentNotRunning,
  ErrorPolykeyAgentDestroyed,
  ErrorPolykeyClientRunning,
  ErrorPolykeyClientNotRunning,
  ErrorPolykeyClientDestroyed,
  ErrorPolykeyClientCreateTimeout,
  ErrorPolykeyClientNodeIdInvalid,
};

/**
 * Recursively export all domain-level error classes
 * This ensures that we have one place to construct and
 * reference all Polykey errors.
 * This is used by RPC to serialize errors from agent to client.
 */
export * from './audit/errors.js';
export * from './sessions/errors.js';
export * from './keys/errors.js';
export * from './vaults/errors.js';
export * from './git/errors.js';
export * from './discovery/errors.js';
export * from './gestalts/errors.js';
export * from './identities/errors.js';
export * from './client/errors.js';
export * from './network/errors.js';
export * from './nodes/errors.js';
export * from './claims/errors.js';
export * from './sigchain/errors.js';
export * from './bootstrap/errors.js';
export * from './notifications/errors.js';
export * from './schema/errors.js';
export * from './status/errors.js';
export * from './tasks/errors.js';
export * from './tokens/errors.js';
export * from './validation/errors.js';
export * from './utils/errors.js';
export * from './workers/errors.js';
