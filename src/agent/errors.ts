import { ErrorPolykey, sysexits } from '../errors';

class ErrorAgent<T> extends ErrorPolykey<T> {}

class ErrorAgentRunning<T> extends ErrorPolykey<T> {
  static description = 'Agent Client is running';
  exitCode = sysexits.USAGE;
}

class ErrorAgentClientNotStarted<T> extends ErrorAgent<T> {
  static description = 'Agent Client is not started';
  exitCode = sysexits.USAGE;
}

class ErrorAgentClientDestroyed<T> extends ErrorAgent<T> {
  static description = 'Agent Client is destroyed';
  exitCode = sysexits.USAGE;
}

class ErrorConnectionInfoMissing<T> extends ErrorAgent<T> {
  static description = 'Vault already exists';
  exitCode = sysexits.UNAVAILABLE;
}

export {
  ErrorAgent,
  ErrorAgentClientNotStarted,
  ErrorAgentRunning,
  ErrorAgentClientDestroyed,
  ErrorConnectionInfoMissing,
};
